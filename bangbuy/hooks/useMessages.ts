'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeCall';
import { eventBus, Events } from '@/lib/events';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[messages] ${message}`, data || '');
  }
};

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
  sendMessage: (content: string) => Promise<boolean>;
  resendMessage: (clientMessageId: string) => Promise<boolean>;
  markAsRead: () => Promise<void>;
}

function generateClientMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const { conversationId } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  
  const processedIds = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

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

  // 載入訊息（直接查詢，不用 RPC）
  const fetchMessages = useCallback(async () => {
    if (!conversationId || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    log('Fetching messages for', conversationId);

    try {
      // 直接查詢 messages 表（使用 safeQuery）
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
        const clientMsgId = m.id; // 使用 id 作為 client_message_id
        return {
          id: m.id,
          sender_id: m.sender_id,
          sender_name: profile?.name || null,
          sender_avatar: profile?.avatar_url || null,
          content: m.content,
          client_message_id: clientMsgId,
          status: 'sent' as MessageStatus,
          created_at: m.created_at,
        };
      });

      setMessages(newMessages);
      processedIds.current = new Set(newMessages.map(m => m.client_message_id));

    } catch (err: any) {
      console.error('[useMessages] Error:', err);
      setError(err.message || '載入訊息失敗');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [conversationId]);

  // 發送訊息（樂觀更新）
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
      // 直接插入 messages（不用 RPC）
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

      // 更新訊息狀態為 sent
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
      
      // 更新訊息狀態為 failed
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

  // 重送失敗的訊息
  const resendMessage = useCallback(async (clientMessageId: string): Promise<boolean> => {
    const failedMessage = messages.find(
      m => m.client_message_id === clientMessageId && m.status === 'failed'
    );

    if (!failedMessage || !conversationId || !currentUserId) return false;

    // 更新狀態為 sending
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

  // 標記已讀（直接更新，不用 RPC）
  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;

    try {
      // 直接更新 conversations 表
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

  // 處理 Realtime 新訊息
  const handleNewMessage = useCallback((payload: any) => {
    const newMsg = payload.new;
    if (!newMsg || newMsg.conversation_id !== conversationId) return;

    // 去重
    if (processedIds.current.has(newMsg.id)) {
      return;
    }

    processedIds.current.add(newMsg.id);
    
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
      // 檢查是否已存在（可能是樂觀更新的訊息）
      const exists = prev.some(m => m.id === newMsg.id || (m.isOptimistic && m.content === newMsg.content));
      if (exists) return prev;
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

  // 初始載入
  useEffect(() => {
    if (conversationId) {
      log('Conversation changed, reloading messages', conversationId);
      setMessages([]);
      processedIds.current.clear();
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  // 監聽 EventBus 的 MESSAGES_REFRESH 事件
  useEffect(() => {
    const unsubscribe = eventBus.on(Events.MESSAGES_REFRESH, (convId: string) => {
      if (convId === conversationId) {
        log('MESSAGES_REFRESH event received', convId);
        setMessages([]);
        processedIds.current.clear();
        fetchMessages();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, fetchMessages]);

  // Realtime 訂閱（帶自動重連）
  const channelRef = useRef<any>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupChannel = useCallback(() => {
    if (!conversationId) return;

    // 清理舊的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    log('Setting up Realtime channel for messages', conversationId);

    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleNewMessage
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          log('Messages Realtime channel SUBSCRIBED');
          reconnectAttemptRef.current = 0;
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          log(`Messages Realtime channel ${status}`, err);

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;

          log(`Messages realtime disconnected -> retry in ${delay}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            setupChannel();
            fetchMessages();
          }, delay);
        }
      });
  }, [conversationId, handleNewMessage, fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [conversationId, setupChannel]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    resendMessage,
    markAsRead,
  };
}
