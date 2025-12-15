'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeCall';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';
import { eventBus, Events } from '@/lib/events';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[conversations] ${message}`, data || '');
  }
};

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
  refresh: () => Promise<void>;
}

export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const { autoRefresh = true } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
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

  // 載入對話列表（直接查詢，不用 RPC）
  const fetchConversations = useCallback(async () => {
    if (!currentUserId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Step 1: 獲取我參與的對話（使用 safeQuery）
      const { data: convData, error: convError } = await safeQuery(
        () => supabase
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

      // Step 2: 獲取對方用戶資料
      const otherUserIds = convData.map(c => 
        c.user1_id === currentUserId ? c.user2_id : c.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', otherUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Step 3: 獲取每個對話的最後一則訊息
      const conversationIds = convData.map(c => c.id);
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // 取每個對話的第一則（最新的）
      const lastMsgMap = new Map<string, string>();
      for (const msg of (lastMessages || [])) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg.content);
        }
      }

      // Step 4: 組裝結果
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
          unread_count: 0, // 簡化版不計算未讀
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
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [currentUserId]);

  // 重新整理
  const refresh = useCallback(async () => {
    log('Refreshing conversations...');
    hasFetchedRef.current = false;
    await fetchConversations();
  }, [fetchConversations]);

  // 註冊到全域 refetchAll
  useEffect(() => {
    if (!currentUserId) return;
    
    const unregister = registerRefetchCallback(refresh);
    return () => {
      unregister();
    };
  }, [currentUserId, refresh]);

  // 監聽 EventBus 的 CONVERSATIONS_REFRESH 事件
  useEffect(() => {
    const unsubscribe = eventBus.on(Events.CONVERSATIONS_REFRESH, () => {
      log('CONVERSATIONS_REFRESH event received');
      refresh();
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  // 初始載入
  useEffect(() => {
    if (currentUserId && !hasFetchedRef.current) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  // Realtime 訂閱（帶自動重連）
  const channelRef = useRef<any>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupChannel = useCallback(() => {
    if (!currentUserId) return;

    // 清理舊的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    log('Setting up Realtime channel...');

    channelRef.current = supabase
      .channel('conversations_list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          log('Realtime channel SUBSCRIBED');
          reconnectAttemptRef.current = 0;
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          log(`Realtime channel ${status}`, err);

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;

          log(`Realtime disconnected -> retry in ${delay}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            setupChannel();
            refresh();
          }, delay);
        }
      });
  }, [currentUserId, refresh]);

  useEffect(() => {
    if (!autoRefresh || !currentUserId) return;

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
  }, [autoRefresh, currentUserId, setupChannel]);

  return {
    conversations,
    loading,
    error,
    totalUnread,
    refresh,
  };
}
