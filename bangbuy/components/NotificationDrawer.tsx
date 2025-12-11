'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_NOTIFICATIONS, getNotificationStyle } from '@/types/notifications';
import type { Notification } from '@/types/notifications';
import NotificationIcon from '@/components/NotificationIcon';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const router = useRouter();
  
  // 🎨 純 UI state：用於控制每個通知的已讀狀態
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  // 🎨 只顯示最近的 5 則通知
  const recentNotifications = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    console.log('notification clicked:', notification.id);
    
    // 標記為已讀（純 UI 更新，不接後端）
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // 關閉 Drawer
    onClose();

    // 如果有目標路徑，可以跳轉（使用現有路由）
    if (notification.targetPath) {
      // router.push(notification.targetPath);
      console.log('would navigate to:', notification.targetPath);
    }
  };

  const handleMarkAllRead = () => {
    console.log('mark all as read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleViewAll = () => {
    console.log('view all notifications');
    onClose();
    router.push('/notifications');
  };

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
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm font-medium">目前沒有通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Avatar or Icon */}
                      {notification.avatarUrl ? (
                        <div className="relative shrink-0">
                          <img
                            src={notification.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {!notification.isRead && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          <div className={`w-10 h-10 rounded-full ${style.bgColor} flex items-center justify-center`}>
                            <NotificationIcon type={notification.type} className={`w-5 h-5 ${style.iconColor}`} />
                          </div>
                          {!notification.isRead && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-bold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                            {notification.time}
                          </span>
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                          {notification.description}
                        </p>
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
            {notifications.length > 5 && (
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

