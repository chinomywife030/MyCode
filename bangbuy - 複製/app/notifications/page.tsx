'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { navigateWithOneReload, shouldUseReloadNavigation } from '@/lib/navigateWithReload';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
    revalidateUnreadCount,
  } = useNotifications({ autoSubscribe: true, limit: 50 });

  // 初始載入時 revalidate
  useEffect(() => {
    revalidateUnreadCount();
  }, [revalidateUnreadCount]);

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
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // 獲取通知類型圖標和樣式
  const getTypeStyle = useCallback((type: string) => {
    switch (type) {
      case 'message':
      case 'message.new':
        return {
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        };
      case 'order':
      case 'order.new':
      case 'order.accepted':
        return {
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case 'wish':
        return {
          bgColor: 'bg-pink-100',
          iconColor: 'text-pink-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          ),
        };
      case 'trip':
        return {
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          ),
        };
      case 'system':
        return {
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
        };
    }
  }, []);

  // 處理通知點擊
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // 1. 如果未讀，標記為已讀
    if (!notification.is_read) {
      // fire-and-forget，不等待
      markRead(notification.id);
    }

    // 2. 跳轉到 href（使用一次性 reload 保底機制）
    const targetHref = notification.href || notification.deep_link;
    if (targetHref) {
      if (shouldUseReloadNavigation(targetHref)) {
        navigateWithOneReload(router, targetHref, `notif:${notification.id}`);
      } else {
        router.push(targetHref);
      }
    }
  }, [markRead, router]);

  // 處理全部已讀
  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  // 載入更多
  const handleLoadMore = useCallback(async () => {
    if (notifications.length === 0 || loading) return;
    
    const lastNotification = notifications[notifications.length - 1];
    await fetchNotifications(50, lastNotification.created_at);
  }, [notifications, loading, fetchNotifications]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} 則未讀通知
              </p>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
            >
              全部已讀
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading && notifications.length === 0 ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-64 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-20 h-20 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-lg font-medium">目前沒有通知</p>
              <p className="text-sm mt-1">當有新消息時，你會在這裡看到</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const style = getTypeStyle(notification.type);
                const isUnread = !notification.is_read;
                const hasLink = notification.href || notification.deep_link;
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors ${
                      isUnread ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Avatar or Icon */}
                      {notification.actor_avatar ? (
                        <div className="relative shrink-0">
                          <img
                            src={notification.actor_avatar}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {isUnread && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 rounded-full ${style.bgColor} flex items-center justify-center ${style.iconColor}`}>
                            {style.icon}
                          </div>
                          {isUnread && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className={`text-sm sm:text-base font-bold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
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
                          <p className="text-xs text-gray-400 mt-1.5">
                            來自 <span className="font-medium">{notification.actor_name}</span>
                          </p>
                        )}
                        
                        {/* Deep Link Indicator */}
                        {hasLink && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                            <span>點擊查看詳情</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {notifications.length >= 20 && (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    載入中...
                  </span>
                ) : (
                  '載入更多'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
