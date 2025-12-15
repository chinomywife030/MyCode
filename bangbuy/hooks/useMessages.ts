'use client';

/**
 * useMessages - 聊天訊息 Hook
 * 
 * 設計原則：
 * 1. fetch 和 realtime 完全分離
 * 2. loading 只跟 fetch 有關，不跟 realtime 連線狀態綁定
 * 3. Realtime 失敗不影響 UI（頁面仍然可用）
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeCall';
import { eventBus, Events } from '@/lib/events';
import { useSimpleRealtime } from '@/lib/realtime';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';

// 日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (msg: string, data?: any) => {
  if (isDev) console.log(`[messages] ${msg}`, data ?? '');
};

// ============================================
// Types
// ============================================

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  client_message_id: string;
  status: MessageStatus;
  created_at: string;
  isOptimistic?: boolean;
}

interface UseMessagesOptions {
  conversationId: string | null;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  realtimeConnected: boolean; // 只是顯示用，不影響功能
  sendMessage: (content: string) => Promise<boolean>;
  resendMessage: (clientMessageId: string) => Promise<boolean>;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

function generateClientMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================
// Hook
// ============================================

export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const { conversationId } = options;

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  
  // Refs
  const processedIds = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // 獲取當前用戶
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        setUserProfile(profile);
      }
    }
    getUser();
  }, []);

  // ============================================
  // Fetch 訊息（獨立於 Realtime）
  // ============================================

  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    log('Fetching messages', conversationId);

    try {
      const { data, error: queryError } = await safeQuery(
        () => supabase
          .from('messages')
          .select('id, sender_id, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100),
        'fetchMessages'
      );

      if (queryError) throw queryError;

      log('Messages loaded', { count: data?.length || 0 });

      // 獲取發送者資料
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      let profileMap = new Map<string, { name: string; avatar_url: string | null }>();
      
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', senderIds);
        
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      const newMessages: Message[] = (data || []).map(m => {
        const profile = profileMap.get(m.sender_id);
        return {
          id: m.id,
          sender_id: m.sender_id,
          sender_name: profile?.name || null,
          sender_avatar: profile?.avatar_url || null,
          content: m.content,
          client_message_id: m.id,
          status: 'sent' as MessageStatus,
          created_at: m.created_at,
        };
      });

      setMessages(newMessages);
      processedIds.current = new Set(newMessages.map(m => m.id));
      hasFetchedRef.current = true;

    } catch (err: any) {
      console.error('[useMessages] Error:', err);
      setError(err.message || '載入訊息失敗');
    } finally {
      // ⚠️ 重要：無論成功失敗，loading 都要結束
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [conversationId]);

  // 刷新
  const refresh = useCallback(async () => {
    log('Refreshing messages');
    processedIds.current.clear();
    await fetchMessages();
  }, [fetchMessages]);

  // 初始載入
  useEffect(() => {
    if (conversationId) {
      hasFetchedRef.current = false;
      setMessages([]);
      processedIds.current.clear();
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  // EventBus 監聽
  useEffect(() => {
    const unsubscribe = eventBus.on(Events.MESSAGES_REFRESH, (convId: string) => {
      if (convId === conversationId) {
        log('MESSAGES_REFRESH event');
        refresh();
      }
    });
    return () => unsubscribe();
  }, [conversationId, refresh]);

  // 全域 refetch
  useEffect(() => {
    if (!conversationId) return;
    const unregister = registerRefetchCallback(refresh);
    return () => unregister();
  }, [conversationId, refresh]);

  // ============================================
  // Realtime（增量更新，失敗不影響 UI）
  // ============================================

  const handleNewMessage = useCallback((payload: any) => {
    const newMsg = payload.new;
    if (!newMsg || newMsg.conversation_id !== conversationId) return;

    // 去重
    if (processedIds.current.has(newMsg.id)) return;
    processedIds.current.add(newMsg.id);
    
    log('New message via realtime', newMsg.id);

    const message: Message = {
      id: newMsg.id,
      sender_id: newMsg.sender_id,
      sender_name: null,
      sender_avatar: null,
      content: newMsg.content,
      client_message_id: newMsg.id,
      status: 'sent',
      created_at: newMsg.created_at,
    };

    setMessages(prev => {
      // 再次檢查避免重複
      if (prev.some(m => m.id === newMsg.id || (m.isOptimistic && m.content === newMsg.content))) {
        return prev;
      }
      return [...prev, message];
    });

    // 異步獲取發送者資料
    supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', newMsg.sender_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMessages(prev =>
            prev.map(m =>
              m.id === newMsg.id
                ? { ...m, sender_name: data.name, sender_avatar: data.avatar_url }
                : m
            )
          );
        }
      });
  }, [conversationId]);

  // Realtime key
  const realtimeKey = useMemo(() => 
    conversationId ? `messages:${conversationId}` : ''
  , [conversationId]);

  // Realtime hook（失敗不影響 UI）
  const { isConnected: realtimeConnected } = useSimpleRealtime({
    key: realtimeKey,
    enabled: !!conversationId,
    table: 'messages',
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    event: 'INSERT',
    onInsert: handleNewMessage,
  });

  // ============================================
  // 發送訊息
  // ============================================

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!conversationId || !currentUserId || !content.trim()) return false;

    const clientMessageId = generateClientMessageId();
    const optimisticMessage: Message = {
      id: `temp-${clientMessageId}`,
      sender_id: currentUserId,
      sender_name: userProfile?.name || null,
      sender_avatar: userProfile?.avatar_url || null,
      content: content.trim(),
      client_message_id: clientMessageId,
      status: 'sending',
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    // 樂觀更新
    setMessages(prev => [...prev, optimisticMessage]);
    processedIds.current.add(clientMessageId);

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim(),
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 更新為 sent
      setMessages(prev =>
        prev.map(m =>
          m.client_message_id === clientMessageId
            ? { ...m, id: insertData.id, status: 'sent' as MessageStatus, isOptimistic: false }
            : m
        )
      );

      // 更新 conversation 的 last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (err: any) {
      console.error('[useMessages] Send error:', err);
      
      // 更新為 failed
      setMessages(prev =>
        prev.map(m =>
          m.client_message_id === clientMessageId
            ? { ...m, status: 'failed' as MessageStatus }
            : m
        )
      );

      return false;
    }
  }, [conversationId, currentUserId, userProfile]);

  // 重送
  const resendMessage = useCallback(async (clientMessageId: string): Promise<boolean> => {
    const failedMessage = messages.find(
      m => m.client_message_id === clientMessageId && m.status === 'failed'
    );

    if (!failedMessage || !conversationId || !currentUserId) return false;

    setMessages(prev =>
      prev.map(m =>
        m.client_message_id === clientMessageId
          ? { ...m, status: 'sending' as MessageStatus }
          : m
      )
    );

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: failedMessage.content,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      setMessages(prev =>
        prev.map(m =>
          m.client_message_id === clientMessageId
            ? { ...m, id: insertData.id, status: 'sent' as MessageStatus, isOptimistic: false }
            : m
        )
      );

      return true;
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.client_message_id === clientMessageId
            ? { ...m, status: 'failed' as MessageStatus }
            : m
        )
      );
      return false;
    }
  }, [conversationId, currentUserId, messages]);

  // 標記已讀
  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;

    try {
      await supabase
        .from('conversations')
        .update({
          user1_last_read_at: new Date().toISOString(),
          user2_last_read_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (err) {
      console.warn('[markAsRead] Error:', err);
    }
  }, [conversationId, currentUserId]);

  return {
    messages,
    loading,
    error,
    realtimeConnected,
    sendMessage,
    resendMessage,
    markAsRead,
    refresh,
  };
}

// 向後兼容
export type MessageHookStatus = 'ok' | 'recovering' | 'error';
