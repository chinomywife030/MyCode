'use client';

/**
 * useNotifications - 通知系統 Hook
 * 
 * 設計原則：
 * 1. fetch 和 realtime 完全分離
 * 2. loading 只跟 fetch 有關
 * 3. Realtime 失敗不影響 UI
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeRpc } from '@/lib/safeCall';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';
import { useSimpleRealtime } from '@/lib/realtime';

// 日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (msg: string, data?: any) => {
  if (isDev) console.log(`[notifications] ${msg}`, data ?? '');
};

// ============================================
// Types
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
  actor_id?: string | null;
  deep_link?: string | null;
  data?: Record<string, any>;
  dedupe_key?: string | null;
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
  realtimeConnected: boolean;
  fetchNotifications: (limit?: number, before?: string | null) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  revalidateUnreadCount: () => Promise<void>;
}

// ============================================
// useNotifications Hook
// ============================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { autoSubscribe = true, limit = 20 } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Refs
  const markedIdsRef = useRef<Set<string>>(new Set());
  const markAllInProgressRef = useRef<boolean>(false);
  const isFetchingRef = useRef(false);

  // 獲取當前用戶
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
  // Fetch Functions
  // ============================================

  const revalidateUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error: rpcError } = await safeRpc('get_unread_notification_count');
      if (!rpcError && typeof data === 'number') {
        setUnreadCount(data);
        log('Unread count updated', data);
      }
    } catch (err) {
      console.error('[useNotifications] revalidateUnreadCount error:', err);
    }
  }, [currentUserId]);

  const fetchNotifications = useCallback(async (
    fetchLimit: number = limit,
    before: string | null = null
  ) => {
    if (!currentUserId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    if (!before) setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await safeRpc('get_notifications', {
        p_limit: fetchLimit,
        p_before: before,
      });

      if (rpcError) throw rpcError;

      log('Fetched notifications', { count: data?.length || 0 });

      const notificationsList: Notification[] = (data || []).map((n: any) => ({
        ...n,
        href: n.href || n.deep_link || null,
      }));

      if (before) {
        setNotifications(prev => [...prev, ...notificationsList]);
      } else {
        setNotifications(notificationsList);
        markedIdsRef.current = new Set();
      }

      // 獲取 actor 資料
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
      isFetchingRef.current = false;
    }
  }, [currentUserId, limit]);

  const refresh = useCallback(async () => {
    log('Refreshing notifications');
    await Promise.all([
      fetchNotifications(limit, null),
      revalidateUnreadCount(),
    ]);
  }, [fetchNotifications, revalidateUnreadCount, limit]);

  // 初始載入
  useEffect(() => {
    if (currentUserId) {
      refresh();
    }
  }, [currentUserId, refresh]);

  // 全域 refetch
  useEffect(() => {
    if (!currentUserId) return;
    const unregister = registerRefetchCallback(refresh);
    return () => unregister();
  }, [currentUserId, refresh]);

  // ============================================
  // Mark Read Functions
  // ============================================

  const markRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    
    if (!notification || notification.is_read || markedIdsRef.current.has(id)) {
      return;
    }

    markedIdsRef.current.add(id);

    // Optimistic Update
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { data, error: rpcError } = await safeRpc('mark_notification_read', {
        p_id: id,
      });

      if (rpcError) {
        console.error('[useNotifications] markRead error:', rpcError);
        // Rollback
        markedIdsRef.current.delete(id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, is_read: false, read_at: null } : n
          )
        );
        setUnreadCount(prev => prev + 1);
        return;
      }

      // 用 server 回傳的 count 覆蓋
      if (data && typeof data.unread_count === 'number') {
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('[useNotifications] markRead exception:', err);
      markedIdsRef.current.delete(id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, is_read: false, read_at: null } : n
        )
      );
      setUnreadCount(prev => prev + 1);
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    markAllInProgressRef.current = true;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    unreadIds.forEach(id => markedIdsRef.current.add(id));

    const prevNotifications = [...notifications];
    const prevUnreadCount = unreadCount;

    // Optimistic Update
    setNotifications(prev =>
      prev.map(n => n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() })
    );
    setUnreadCount(0);

    try {
      const { data, error: rpcError } = await safeRpc('mark_all_notifications_read');

      if (rpcError) {
        console.error('[useNotifications] markAllRead error:', rpcError);
        unreadIds.forEach(id => markedIdsRef.current.delete(id));
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        return;
      }

      setUnreadCount(typeof data === 'number' ? data : 0);
    } catch (err) {
      console.error('[useNotifications] markAllRead exception:', err);
      unreadIds.forEach(id => markedIdsRef.current.delete(id));
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
    } finally {
      setTimeout(() => {
        markAllInProgressRef.current = false;
      }, 2000);
    }
  }, [notifications, unreadCount]);

  // ============================================
  // Realtime（增量更新，失敗不影響 UI）
  // ============================================

  const handleInsert = useCallback((payload: any) => {
    const newNotification = payload.new as Notification;
    
    const notification: Notification = {
      ...newNotification,
      href: newNotification.href || (newNotification as any).deep_link || null,
    };

    setNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });

    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }

    // 獲取 actor 資料
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
  }, []);

  const handleUpdate = useCallback((payload: any) => {
    const updated = payload.new as Notification;
    const old = payload.old as any;

    setNotifications(prev =>
      prev.map(n =>
        n.id === updated.id 
          ? { ...n, ...updated, href: updated.href || (updated as any).deep_link } 
          : n
      )
    );

    // 未讀 -> 已讀
    const wasUnread = old.is_read === false;
    const isNowRead = updated.is_read === true;
    
    if (wasUnread && isNowRead) {
      if (markAllInProgressRef.current || markedIdsRef.current.has(updated.id)) {
        return;
      }
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const realtimeKey = useMemo(() => 
    currentUserId ? `notifications:${currentUserId}` : ''
  , [currentUserId]);

  const { isConnected: realtimeConnected } = useSimpleRealtime({
    key: realtimeKey,
    enabled: autoSubscribe && !!currentUserId,
    table: 'notifications',
    filter: currentUserId ? `user_id=eq.${currentUserId}` : undefined,
    event: '*',
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  return {
    notifications,
    unreadCount,
    loading,
    error,
    realtimeConnected,
    fetchNotifications,
    markRead,
    markAllRead,
    refresh,
    revalidateUnreadCount,
  };
}

// ============================================
// useNotificationBadge Hook（簡化版，只取未讀數）
// ============================================

interface UseNotificationBadgeReturn {
  unreadCount: number;
  currentUserId: string | null;
  realtimeConnected: boolean;
  revalidate: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotificationBadge(): UseNotificationBadgeReturn {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const processedIdsRef = useRef<Set<string>>(new Set());
  const markAllInProgressRef = useRef<boolean>(false);

  // 手動刷新
  const revalidate = useCallback(async () => {
    try {
      const { data, error } = await safeRpc('get_unread_notification_count');
      if (!error && typeof data === 'number') {
        setUnreadCount(data);
        log('Badge count updated', data);
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
        const { data, error } = await safeRpc('get_unread_notification_count');
        if (!error && typeof data === 'number') {
          setUnreadCount(data);
        }
      } catch (err) {
        console.error('[useNotificationBadge] init error:', err);
      }
    }
    init();
  }, []);

  // 全域 refetch
  useEffect(() => {
    if (!currentUserId) return;
    const unregister = registerRefetchCallback(revalidate);
    return () => unregister();
  }, [currentUserId, revalidate]);

  // Realtime
  const handleInsert = useCallback((payload: any) => {
    const notification = payload.new as any;
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const handleUpdate = useCallback((payload: any) => {
    const old = payload.old as any;
    const newData = payload.new as any;

    if (old.is_read === false && newData.is_read === true) {
      if (markAllInProgressRef.current) return;
      if (!processedIdsRef.current.has(newData.id)) {
        processedIdsRef.current.add(newData.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        setTimeout(() => {
          processedIdsRef.current.delete(newData.id);
        }, 5000);
      }
    }
  }, []);

  const realtimeKey = useMemo(() => 
    currentUserId ? `notification_badge:${currentUserId}` : ''
  , [currentUserId]);

  const { isConnected: realtimeConnected } = useSimpleRealtime({
    key: realtimeKey,
    enabled: !!currentUserId,
    table: 'notifications',
    filter: currentUserId ? `user_id=eq.${currentUserId}` : undefined,
    event: '*',
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  const markAllRead = useCallback(async () => {
    markAllInProgressRef.current = true;
    setUnreadCount(0);

    try {
      const { data, error } = await safeRpc('mark_all_notifications_read');
      if (error) {
        console.error('[useNotificationBadge] markAllRead error:', error);
        await revalidate();
      } else {
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

  return { unreadCount, currentUserId, realtimeConnected, revalidate, markAllRead };
}

// 向後兼容
export type NotificationHookStatus = 'ok' | 'recovering' | 'error';
