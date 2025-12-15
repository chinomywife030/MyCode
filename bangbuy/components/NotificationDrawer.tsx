'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { eventBus, Events } from '@/lib/events';
import { navigateWithOneReload, shouldUseReloadNavigation } from '@/lib/navigateWithReload';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const router = useRouter();
  
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    fetchNotifications,
    revalidateUnreadCount,
  } = useNotifications({ autoSubscribe: true, limit: 20 });

  // 當 Drawer 打開時：刷新列表 + 背景 revalidate unreadCount
  useEffect(() => {
    if (isOpen) {
      // 刷新通知列表
      fetchNotifications(20, null);
      // 背景 revalidate（不影響 UX）
      revalidateUnreadCount();
    }
  }, [isOpen, fetchNotifications, revalidateUnreadCount]);

  // 只顯示前 10 則
  const recentNotifications = notifications.slice(0, 10);

  // 格式化時間
  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }, []);

  // 獲取通知類型圖標
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'message':
      case 'message.new':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'order':
      case 'order.new':
      case 'order.accepted':
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'wish':
        return (
          <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'trip':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  }, []);

  // 獲取通知類型背景色
  const getTypeBgColor = useCallback((type: string) => {
    switch (type) {
      case 'message':
      case 'message.new': return 'bg-blue-100';
      case 'order':
      case 'order.new':
      case 'order.accepted': return 'bg-orange-100';
      case 'wish': return 'bg-pink-100';
      case 'trip': return 'bg-green-100';
      case 'system': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  }, []);

  // 處理通知點擊：標記已讀 + 跳轉
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // 1. 如果該筆未讀：呼叫 markRead（optimistic update，立即更新紅點）
    if (!notification.is_read) {
      // 不等待 RPC 完成，使用 fire-and-forget + optimistic update
      markRead(notification.id);
    }

    // 2. 關閉 Drawer
    onClose();

    // 3. 若該筆有 href：跳轉
    const targetHref = notification.href || notification.deep_link;
    if (targetHref) {
      // 觸發對話列表刷新
      eventBus.emit(Events.CONVERSATIONS_REFRESH);
      
      // 如果是 chat 相關的通知，額外觸發 CHAT_OPEN
      if (targetHref.includes('/chat') && targetHref.includes('conversation=')) {
        const convMatch = targetHref.match(/conversation=([^&]+)/);
        if (convMatch) {
          eventBus.emit(Events.CHAT_OPEN, convMatch[1]);
        }
      }

      // 導航（使用一次性 reload 保底機制）
      if (shouldUseReloadNavigation(targetHref)) {
        navigateWithOneReload(router, targetHref, `notif:${notification.id}`);
      } else {
        router.push(targetHref);
      }
    }
  }, [markRead, onClose, router]);

  // 處理全部已讀
  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  // 查看所有通知
  const handleViewAll = useCallback(() => {
    onClose();
    router.push('/notifications');
  }, [onClose, router]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[101] w-full sm:w-96 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-blue-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">通知</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition"
              aria-label="關閉通知"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              全部標記為已讀
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm font-medium">目前沒有通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notification) => {
                const isUnread = !notification.is_read;
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      isUnread ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar or Icon */}
                      {notification.actor_avatar ? (
                        <div className="relative shrink-0">
                          <img
                            src={notification.actor_avatar}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isUnread && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          <div className={`w-10 h-10 rounded-full ${getTypeBgColor(notification.type)} flex items-center justify-center`}>
                            {getTypeIcon(notification.type)}
                          </div>
                          {isUnread && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-bold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        {notification.body && (
                          <p className={`text-sm ${isUnread ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                            {notification.body}
                          </p>
                        )}
                        {notification.actor_name && (
                          <p className="text-xs text-gray-400 mt-1">
                            來自 {notification.actor_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleViewAll}
            className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition shadow-sm"
          >
            查看所有通知
            {notifications.length > 10 && (
              <span className="ml-1.5 text-xs opacity-90">
                ({notifications.length})
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
