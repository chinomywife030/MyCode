'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { safeRpc } from '@/lib/safeCall';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[notifications] ${message}`, data || '');
  }
};

// ============================================
// 🔔 Notification Types
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  source_type: string | null;
  source_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // 舊版相容
  actor_id?: string | null;
  deep_link?: string | null;
  data?: Record<string, any>;
  dedupe_key?: string | null;
  // 前端擴充
  actor_name?: string;
  actor_avatar?: string;
}

interface UseNotificationsOptions {
  autoSubscribe?: boolean;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (limit?: number, before?: string | null) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  revalidateUnreadCount: () => Promise<void>;
}

// ============================================
// 🔔 useNotifications Hook（完整版）
// ============================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { autoSubscribe = true, limit = 20 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef<boolean>(false);
  
  // 追蹤已經標記過的 ID，確保 idempotent
  const markedIdsRef = useRef<Set<string>>(new Set());
  
  // 追蹤「全部標記已讀」是否正在進行中（防止 Realtime 重複扣數）
  const markAllInProgressRef = useRef<boolean>(false);

  // ============================================
  // 獲取當前用戶
  // ============================================
  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (err) {
        console.error('[useNotifications] getUser error:', err);
      }
    }
    getUser();
  }, []);

  // ============================================
  // 獲取未讀數量（用於 revalidate）
  // ============================================
  const revalidateUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error: rpcError } = await safeRpc('get_unread_notification_count');

      if (rpcError) {
        console.error('[useNotifications] revalidateUnreadCount error:', rpcError);
        return;
      }

      setUnreadCount(data || 0);
      log('Unread count updated', data);
    } catch (err) {
      console.error('[useNotifications] revalidateUnreadCount exception:', err);
    }
  }, [currentUserId]);

  // ============================================
  // 獲取通知列表
  // ============================================
  const fetchNotifications = useCallback(async (
    fetchLimit: number = limit,
    before: string | null = null
  ) => {
    if (!currentUserId) return;

    if (!before) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: rpcError } = await safeRpc('get_notifications', {
        p_limit: fetchLimit,
        p_before: before,
      });

      if (rpcError) {
        throw rpcError;
      }

      log('Fetched notifications', { count: data?.length || 0 });

      // 轉換資料格式
      const notificationsList: Notification[] = (data || []).map((n: any) => ({
        ...n,
        // 確保 href 有值（優先使用 href，其次 deep_link）
        href: n.href || n.deep_link || null,
      }));

      if (before) {
        // 追加模式（載入更多）
        setNotifications(prev => [...prev, ...notificationsList]);
      } else {
        // 替換模式
        setNotifications(notificationsList);
        // 重置已標記集合
        markedIdsRef.current = new Set();
      }

      // 獲取 actor 資料（異步）
      const actorIds = [...new Set(notificationsList.map(n => n.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', actorIds)
          .then(({ data: profiles }) => {
            if (profiles) {
              const actorMap = new Map(profiles.map((p: any) => [p.id, p]));
              setNotifications(prev =>
                prev.map(n => {
                  const actor = actorMap.get(n.actor_id || '');
                  return actor
                    ? { ...n, actor_name: actor.name, actor_avatar: actor.avatar_url }
                    : n;
                })
              );
            }
          });
      }

    } catch (err: any) {
      console.error('[useNotifications] fetchNotifications error:', err);
      setError(err.message || '載入通知失敗');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, limit]);

  // ============================================
  // 標記單筆已讀（Optimistic Update + Idempotent）
  // ============================================
  const markRead = useCallback(async (id: string) => {
    // 找到該通知
    const notification = notifications.find(n => n.id === id);
    
    // Idempotent：如果已經已讀或已經處理過，不重複扣數
    if (!notification || notification.is_read || markedIdsRef.current.has(id)) {
      return;
    }

    // 標記為已處理
    markedIdsRef.current.add(id);

    // Optimistic Update：先更新本地
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      // 呼叫 RPC
      const { data, error: rpcError } = await safeRpc('mark_notification_read', {
        p_notification_id: id,
      });

      if (rpcError) {
        console.error('[useNotifications] markRead RPC error:', rpcError);
        // 回滾
        markedIdsRef.current.delete(id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, is_read: false, read_at: null } : n
          )
        );
        setUnreadCount(prev => prev + 1);
        return;
      }

      // 用 server 回傳的 unread_count 覆蓋本地（最終一致性）
      if (data && typeof data.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      }

    } catch (err) {
      console.error('[useNotifications] markRead exception:', err);
      // 回滾
      markedIdsRef.current.delete(id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, is_read: false, read_at: null } : n
        )
      );
      setUnreadCount(prev => prev + 1);
    }
  }, [notifications]);

  // ============================================
  // 標記全部已讀（Optimistic + Idempotent）
  // ============================================
  const markAllRead = useCallback(async () => {
    // 標記正在進行中（防止 Realtime 重複扣數）
    markAllInProgressRef.current = true;

    // 記錄當前所有未讀的 ID（用於防止 Realtime 重複扣）
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    unreadIds.forEach(id => markedIdsRef.current.add(id));

    // Optimistic Update
    const prevNotifications = [...notifications];
    const prevUnreadCount = unreadCount;

    setNotifications(prev =>
      prev.map(n => n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() })
    );
    setUnreadCount(0);

    try {
      const { data, error: rpcError } = await safeRpc('mark_all_notifications_read');

      if (rpcError) {
        console.error('[useNotifications] markAllRead error:', rpcError);
        // 回滾
        unreadIds.forEach(id => markedIdsRef.current.delete(id));
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        return;
      }

      // RPC 回傳 0（全部已讀後未讀數必為 0）
      // 最終一致性保險
      setUnreadCount(typeof data === 'number' ? data : 0);

    } catch (err) {
      console.error('[useNotifications] markAllRead exception:', err);
      // 回滾
      unreadIds.forEach(id => markedIdsRef.current.delete(id));
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
    } finally {
      // 延遲清除標記（等 Realtime 事件處理完）
      setTimeout(() => {
        markAllInProgressRef.current = false;
      }, 2000);
    }
  }, [notifications, unreadCount]);

  // ============================================
  // 刷新
  // ============================================
  const refresh = useCallback(async () => {
    log('Refreshing notifications...');
    await Promise.all([
      fetchNotifications(limit, null),
      revalidateUnreadCount(),
    ]);
  }, [fetchNotifications, revalidateUnreadCount, limit]);

  // ============================================
  // 註冊到全域 refetchAll
  // ============================================
  useEffect(() => {
    if (!currentUserId) return;
    
    const unregister = registerRefetchCallback(refresh);
    return () => {
      unregister();
    };
  }, [currentUserId, refresh]);

  // ============================================
  // 初始載入
  // ============================================
  useEffect(() => {
    if (currentUserId) {
      refresh();
    }
  }, [currentUserId, refresh]);

  // ============================================
  // Realtime 訂閱（帶自動重連）
  // ============================================
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupRealtimeChannel = useCallback(() => {
    if (!currentUserId) return;

    // 先清理舊的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    log('Setting up Realtime channel...');

    channelRef.current = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // 確保 href 有值
          const notification: Notification = {
            ...newNotification,
            href: newNotification.href || (newNotification as any).deep_link || null,
          };

          // 新增到列表頂部（避免重複）
          setNotifications(prev => {
            if (prev.some(n => n.id === notification.id)) {
              return prev;
            }
            return [notification, ...prev];
          });

          // 更新未讀數（只有未讀的才 +1）
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
          }

          // 異步獲取 actor 資料
          if (notification.actor_id) {
            supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', notification.actor_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setNotifications(prev =>
                    prev.map(n =>
                      n.id === notification.id
                        ? { ...n, actor_name: data.name, actor_avatar: data.avatar_url }
                        : n
                    )
                  );
                }
              });
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
          const updatedNotification = payload.new as Notification;
          const oldNotification = payload.old as any;

          // 更新列表
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id 
                ? { ...n, ...updatedNotification, href: updatedNotification.href || (updatedNotification as any).deep_link } 
                : n
            )
          );

          // 如果從未讀變成已讀，且本地還沒處理過，減少未讀數
          const wasUnread = oldNotification.is_read === false;
          const isNowRead = updatedNotification.is_read === true;
          
          // 🔒 防呆：如果「全部標記已讀」正在進行中，或該 ID 已處理過，不重複扣
          if (wasUnread && isNowRead) {
            if (markAllInProgressRef.current || markedIdsRef.current.has(updatedNotification.id)) {
              // 已經 optimistic 處理過，不重複扣
              return;
            }
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          log('Realtime channel SUBSCRIBED');
          reconnectAttemptRef.current = 0;
          isSubscribedRef.current = true;
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          log(`Realtime channel ${status}`, err);
          isSubscribedRef.current = false;

          // Exponential backoff 重連
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;

          log(`Realtime disconnected -> retry in ${delay}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeChannel();
            // 重連成功後刷新資料
            refresh();
          }, delay);
        }
      });
  }, [currentUserId, refresh]);

  useEffect(() => {
    if (!autoSubscribe || !currentUserId || isSubscribedRef.current) return;

    setupRealtimeChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoSubscribe, currentUserId, setupRealtimeChannel]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    refresh,
    revalidateUnreadCount,
  };
}

// ============================================
// 🔔 簡化 Hook：只取未讀數（用於 Navbar Badge）
// ============================================

export function useNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef<boolean>(false);
  
  // 追蹤本地已處理的 ID
  const processedIdsRef = useRef<Set<string>>(new Set());
  
  // 追蹤「全部標記已讀」是否正在進行中
  const markAllInProgressRef = useRef<boolean>(false);

  // 重連計數器
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 手動刷新函數
  const revalidate = useCallback(async () => {
    try {
      const { data, error } = await safeRpc('get_unread_notification_count');
      if (!error) {
        setUnreadCount(data || 0);
        log('Badge unread count updated', data);
      }
    } catch (err) {
      console.error('[useNotificationBadge] revalidate error:', err);
    }
  }, []);

  // 初始化
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // 獲取未讀數（使用 safeRpc）
        const { data, error } = await safeRpc('get_unread_notification_count');
        if (!error) {
          setUnreadCount(data || 0);
        }
      } catch (err) {
        console.error('[useNotificationBadge] init error:', err);
      }
    }
    init();
  }, []);

  // 註冊到全域 refetchAll
  useEffect(() => {
    if (!currentUserId) return;
    
    const unregister = registerRefetchCallback(revalidate);
    return () => {
      unregister();
    };
  }, [currentUserId, revalidate]);

  // 設置 Realtime channel（帶重連）
  const setupChannel = useCallback(() => {
    if (!currentUserId) return;

    // 先清理舊的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`notification_badge:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          // 新通知且未讀
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
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
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // 從未讀變成已讀，且尚未處理過
          if (oldData.is_read === false && newData.is_read === true) {
            // 🔒 防呆：如果「全部標記已讀」正在進行中，不重複扣
            if (markAllInProgressRef.current) {
              return;
            }
            if (!processedIdsRef.current.has(newData.id)) {
              processedIdsRef.current.add(newData.id);
              setUnreadCount(prev => Math.max(0, prev - 1));
              
              // 5 秒後從處理集合移除（避免記憶體無限增長）
              setTimeout(() => {
                processedIdsRef.current.delete(newData.id);
              }, 5000);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          log('Badge Realtime channel SUBSCRIBED');
          reconnectAttemptRef.current = 0;
          isSubscribedRef.current = true;
        } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          log(`Badge Realtime channel ${status}`, err);
          isSubscribedRef.current = false;

          // Exponential backoff 重連
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;

          log(`Badge realtime disconnected -> retry in ${delay}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            setupChannel();
            revalidate();
          }, delay);
        }
      });
  }, [currentUserId, revalidate]);

  // Realtime 訂閱
  useEffect(() => {
    if (!currentUserId || isSubscribedRef.current) return;

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUserId, setupChannel]);

  // 全部標記已讀（給 Badge 用，同步 unreadCount 歸零）
  const markAllRead = useCallback(async () => {
    markAllInProgressRef.current = true;
    
    // Optimistic update
    setUnreadCount(0);

    try {
      const { data, error } = await safeRpc('mark_all_notifications_read');
      if (error) {
        console.error('[useNotificationBadge] markAllRead error:', error);
        // 失敗則 revalidate
        await revalidate();
      } else {
        // 最終一致性
        setUnreadCount(typeof data === 'number' ? data : 0);
      }
    } catch (err) {
      console.error('[useNotificationBadge] markAllRead exception:', err);
      await revalidate();
    } finally {
      setTimeout(() => {
        markAllInProgressRef.current = false;
      }, 2000);
    }
  }, [revalidate]);

  return { unreadCount, currentUserId, revalidate, markAllRead };
}
