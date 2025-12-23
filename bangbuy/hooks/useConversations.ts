'use client';

/**
 * useConversations - 對話列表 Hook
 * 
 * 設計原則：
 * 1. fetch 和 realtime 完全分離
 * 2. loading 只跟 fetch 有關
 * 3. Realtime 失敗不影響 UI
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeCall';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';
import { eventBus, Events } from '@/lib/events';
import { useSimpleRealtime } from '@/lib/realtime';

// 日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (msg: string, data?: any) => {
  if (isDev) console.log(`[conversations] ${msg}`, data ?? '');
};

// ============================================
// Types
// ============================================

export interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  source_type: string | null;
  source_id: string | null;
  source_title: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  is_blocked: boolean;
  created_at: string;
}

interface UseConversationsOptions {
  autoRefresh?: boolean;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  totalUnread: number;
  realtimeConnected: boolean;
  refresh: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { autoRefresh = true } = options;

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Refs
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // 計算總未讀數
  const totalUnread = useMemo(() => 
    conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0), 
    [conversations]
  );

  // 獲取當前用戶
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getUser();
  }, []);

  // ============================================
  // Fetch 對話列表
  // ============================================

  const fetchConversations = useCallback(async () => {
    if (!currentUserId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { data: convData, error: convError } = await safeQuery(
        async () => await supabase
          .from('conversations')
          .select('id, user1_id, user2_id, source_type, source_id, source_title, last_message_at, created_at')
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(50),
        'fetchConversations'
      );

      if (convError) throw convError;

      log('Fetched conversations', { count: convData?.length || 0 });

      if (!convData || convData.length === 0) {
        setConversations([]);
        hasFetchedRef.current = true;
        return;
      }

      // 獲取對方用戶資料
      const otherUserIds = convData.map(c => 
        c.user1_id === currentUserId ? c.user2_id : c.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', otherUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // 獲取最後一則訊息
      const conversationIds = convData.map(c => c.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, string>();
      for (const msg of (lastMessages || [])) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg.content);
        }
      }

      // 組裝結果
      const newConversations: Conversation[] = convData.map(c => {
        const otherId = c.user1_id === currentUserId ? c.user2_id : c.user1_id;
        const profile = profileMap.get(otherId);
        
        return {
          id: c.id,
          other_user_id: otherId,
          other_user_name: profile?.name || null,
          other_user_avatar: profile?.avatar_url || null,
          source_type: c.source_type,
          source_id: c.source_id,
          source_title: c.source_title,
          last_message_at: c.last_message_at,
          last_message_preview: lastMsgMap.get(c.id) || null,
          unread_count: 0,
          is_blocked: false,
          created_at: c.created_at,
        };
      });

      setConversations(newConversations);
      hasFetchedRef.current = true;

    } catch (err: any) {
      console.error('[useConversations] Error:', err);
      setError(err.message || '載入對話失敗');
    } finally {
      // ⚠️ 重要：無論成功失敗，loading 都要結束
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentUserId]);

  // 刷新
  const refresh = useCallback(async () => {
    log('Refreshing conversations');
    hasFetchedRef.current = false;
    await fetchConversations();
  }, [fetchConversations]);

  // 初始載入
  useEffect(() => {
    if (currentUserId && !hasFetchedRef.current) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  // 全域 refetch
  useEffect(() => {
    if (!currentUserId) return;
    const unregister = registerRefetchCallback(refresh);
    return () => unregister();
  }, [currentUserId, refresh]);

  // EventBus 監聽
  useEffect(() => {
    const unsubscribe = eventBus.on(Events.CONVERSATIONS_REFRESH, () => {
      log('CONVERSATIONS_REFRESH event');
      refresh();
    });
    return () => unsubscribe();
  }, [refresh]);

  // ============================================
  // Realtime（增量更新，失敗不影響 UI）
  // ============================================

  const handleConversationChange = useCallback(() => {
    log('Conversation change via realtime, refreshing');
    refresh();
  }, [refresh]);

  const realtimeKey = useMemo(() => 
    currentUserId ? `conversations:${currentUserId}` : ''
  , [currentUserId]);

  // ✅ 修正：監聽 conversations 表而非 messages，並加上過濾條件
  // 只監聽與當前用戶相關的對話更新
  const { isConnected: realtimeConnected } = useSimpleRealtime({
    key: realtimeKey,
    enabled: autoRefresh && !!currentUserId,
    table: 'conversations',
    // 過濾：只監聽自己參與的對話
    filter: currentUserId ? `user1_id=eq.${currentUserId}` : undefined,
    event: '*',
    onChange: handleConversationChange,
  });
  
  // 額外監聽 user2_id 的變化（因為 Supabase filter 不支援 OR）
  const realtimeKey2 = useMemo(() => 
    currentUserId ? `conversations2:${currentUserId}` : ''
  , [currentUserId]);
  
  useSimpleRealtime({
    key: realtimeKey2,
    enabled: autoRefresh && !!currentUserId,
    table: 'conversations',
    filter: currentUserId ? `user2_id=eq.${currentUserId}` : undefined,
    event: '*',
    onChange: handleConversationChange,
  });

  return {
    conversations,
    loading,
    error,
    totalUnread,
    realtimeConnected,
    refresh,
  };
}

// 向後兼容
export type ConversationHookStatus = 'ok' | 'recovering' | 'error';
