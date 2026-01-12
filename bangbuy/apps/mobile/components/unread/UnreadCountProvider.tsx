/**
 * UnreadCountProvider - 全域未讀訊息數 Context Provider
 * 
 * 提供即時更新的未讀訊息數，使用 Supabase Realtime 訂閱來即時更新
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { getConversations } from '@/src/lib/messaging';
import { getCurrentUser } from '@/src/lib/auth';
import { getUnreadCount as getNotificationsUnreadCount } from '@/src/lib/notifications';

interface UnreadCountContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  unreadNotificationsCount: number;
  refreshUnreadNotifications: () => Promise<void>;
  isLoading: boolean;
}

const UnreadCountContext = createContext<UnreadCountContextValue | undefined>(undefined);

export function useUnreadCount() {
  const context = useContext(UnreadCountContext);
  if (!context) {
    throw new Error('useUnreadCount must be used within UnreadCountProvider');
  }
  return context;
}

interface UnreadCountProviderProps {
  children: React.ReactNode;
}

export function UnreadCountProvider({ children }: UnreadCountProviderProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Debounce timer refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceNotificationsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Realtime subscription refs
  const messagesSubscriptionRef = useRef<any>(null);
  const conversationsSubscriptionRef = useRef<any>(null);
  const notificationsSubscriptionRef = useRef<any>(null);

  /**
   * 從 Supabase 計算所有未讀訊息總數
   * 不使用累加，每次都從資料庫重新計算
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 取得當前用戶
      const user = await getCurrentUser();
      if (!user) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      // 從 Supabase 取得對話列表（包含 unreadCount）
      const conversations = await getConversations();
      
      // 計算總未讀數：sum 所有 conversations 的 unreadCount
      const totalUnread = conversations.reduce((sum, conv) => {
        const unread = conv.unreadCount || 0;
        return sum + unread;
      }, 0);
      
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('[UnreadCountProvider] Error refreshing unread count:', error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 從 Supabase 計算目前使用者未讀通知數
   * 不使用累加，每次都從資料庫重新計算
   */
  const refreshUnreadNotifications = useCallback(async () => {
    try {
      // 取得當前用戶
      const user = await getCurrentUser();
      if (!user) {
        setUnreadNotificationsCount(0);
        return;
      }

      // 從 Supabase 查詢未讀通知數
      const count = await getNotificationsUnreadCount();
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error('[UnreadCountProvider] Error refreshing unread notifications count:', error);
      setUnreadNotificationsCount(0);
    }
  }, []);

  // Ref to store refresh function to avoid re-subscribing
  const refreshUnreadCountRef = useRef(refreshUnreadCount);
  const refreshUnreadNotificationsRef = useRef(refreshUnreadNotifications);
  
  // Update refs when functions change
  useEffect(() => {
    refreshUnreadCountRef.current = refreshUnreadCount;
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshUnreadNotificationsRef.current = refreshUnreadNotifications;
  }, [refreshUnreadNotifications]);

  // Ref to store debounced refresh functions
  const debouncedRefreshRef = useRef<() => void>();
  const debouncedRefreshNotificationsRef = useRef<() => void>();

  /**
   * Debounced refresh functions
   * 300ms debounce 避免過度刷新
   * 使用 ref 來避免依賴變化導致重新訂閱
   */
  useEffect(() => {
    debouncedRefreshRef.current = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        refreshUnreadCountRef.current();
      }, 300);
    };

    debouncedRefreshNotificationsRef.current = () => {
      if (debounceNotificationsTimerRef.current) {
        clearTimeout(debounceNotificationsTimerRef.current);
      }
      debounceNotificationsTimerRef.current = setTimeout(() => {
        refreshUnreadNotificationsRef.current();
      }, 300);
    };
  }, []);

  // 初始載入
  useEffect(() => {
    refreshUnreadCount();
    refreshUnreadNotifications();
  }, [refreshUnreadCount, refreshUnreadNotifications]);

  // AppState 監聽：當 App 從 background -> active 時刷新
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App 從背景回到前景時，刷新未讀數
        refreshUnreadCount();
        refreshUnreadNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshUnreadCount, refreshUnreadNotifications]);

  // 監聽 Auth 狀態變化：登出時重置未讀數
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // 用戶登出時，重置未讀數
        setUnreadCount(0);
        setUnreadNotificationsCount(0);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session) {
        // 用戶登入時，刷新未讀數
        refreshUnreadCount();
        refreshUnreadNotifications();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUnreadCount, refreshUnreadNotifications]);

  // Supabase Realtime 訂閱
  useEffect(() => {
    let mounted = true;
    let currentUserId: string | null = null;

    const setupRealtimeSubscriptions = async () => {
      try {
        // 取得當前用戶
        const user = await getCurrentUser();
        if (!user) {
          // 未登入時，不建立訂閱
          setUnreadCount(0);
          setUnreadNotificationsCount(0);
          setIsLoading(false);
          return;
        }

        currentUserId = user.id;

        // 1. 訂閱 messages 表的 INSERT 事件
        // 當有新訊息插入時，可能影響未讀數
        // 注意：Supabase filter 無法直接過濾 conversation_id，所以訂閱所有 messages，然後在 callback 中過濾
        messagesSubscriptionRef.current = supabase
          .channel('messages_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            async (payload) => {
              if (mounted) {
                const newMessage = payload.new as any;
                console.log('[UnreadCountProvider] New message inserted:', newMessage);
                
                // 檢查這個訊息是否與當前用戶相關
                // 需要查詢 conversation 來確認用戶是否參與
                // 為了避免過度查詢，我們直接刷新未讀數（debounced）
                // 如果訊息不是給當前用戶的，refreshUnreadCount 會正確計算（因為會重新查詢所有 conversations）
                if (debouncedRefreshRef.current) {
                  debouncedRefreshRef.current();
                }
              }
            }
          )
          .subscribe();

        // 2. 訂閱 conversations 表的 UPDATE 事件
        // 當 user1_last_read_at 或 user2_last_read_at 更新時，未讀數會變化
        // 注意：Supabase filter 不支援 OR 條件，所以訂閱所有 conversations 更新，然後在 callback 中過濾
        conversationsSubscriptionRef.current = supabase
          .channel('conversations_changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversations',
            },
            (payload) => {
              if (mounted && currentUserId) {
                const newData = payload.new as any;
                // 檢查是否與當前用戶相關的對話
                const isRelevant = 
                  newData?.user1_id === currentUserId || 
                  newData?.user2_id === currentUserId;
                
                if (isRelevant) {
                  console.log('[UnreadCountProvider] Conversation updated:', payload.new);
                  // 檢查是否有 last_read_at 欄位更新
                  const oldData = payload.old as any;
                  const readAtChanged = 
                    oldData?.user1_last_read_at !== newData?.user1_last_read_at ||
                    oldData?.user2_last_read_at !== newData?.user2_last_read_at;
                  
                  if (readAtChanged) {
                    if (debouncedRefreshRef.current) {
                      debouncedRefreshRef.current();
                    }
                  }
                }
              }
            }
          )
          .subscribe();

        // 3. 訂閱 notifications 表的 INSERT 和 UPDATE 事件
        // 當有新通知插入或 is_read 更新時，影響未讀數
        notificationsSubscriptionRef.current = supabase
          .channel('notifications_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUserId}`,
            },
            (payload) => {
              if (mounted) {
                console.log('[UnreadCountProvider] New notification inserted:', payload.new);
                if (debouncedRefreshNotificationsRef.current) {
                  debouncedRefreshNotificationsRef.current();
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUserId}`,
            },
            (payload) => {
              if (mounted) {
                const oldData = payload.old as any;
                const newData = payload.new as any;
                // 檢查 is_read 欄位是否有變化
                if (oldData?.is_read !== newData?.is_read) {
                  console.log('[UnreadCountProvider] Notification is_read updated:', payload.new);
                  if (debouncedRefreshNotificationsRef.current) {
                    debouncedRefreshNotificationsRef.current();
                  }
                }
              }
            }
          )
          .subscribe();

        console.log('[UnreadCountProvider] Realtime subscriptions established');
      } catch (error) {
        console.error('[UnreadCountProvider] Error setting up realtime subscriptions:', error);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup: 取消訂閱
    return () => {
      mounted = false;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (debounceNotificationsTimerRef.current) {
        clearTimeout(debounceNotificationsTimerRef.current);
        debounceNotificationsTimerRef.current = null;
      }

      if (messagesSubscriptionRef.current) {
        supabase.removeChannel(messagesSubscriptionRef.current);
        messagesSubscriptionRef.current = null;
      }

      if (conversationsSubscriptionRef.current) {
        supabase.removeChannel(conversationsSubscriptionRef.current);
        conversationsSubscriptionRef.current = null;
      }

      if (notificationsSubscriptionRef.current) {
        supabase.removeChannel(notificationsSubscriptionRef.current);
        notificationsSubscriptionRef.current = null;
      }
    };
  }, []); // 空依賴：只在 mount/unmount 時執行，避免重新訂閱

  const value: UnreadCountContextValue = {
    unreadCount,
    refreshUnreadCount,
    unreadNotificationsCount,
    refreshUnreadNotifications,
    isLoading,
  };

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
}
