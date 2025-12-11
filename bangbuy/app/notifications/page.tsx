'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MOCK_NOTIFICATIONS, getNotificationStyle, getNotificationTypeName } from '@/types/notifications';
import type { Notification, NotificationType } from '@/types/notifications';
import NotificationIcon from '@/components/NotificationIcon';
import { handleNotificationClick as handleNotificationNavigation } from '@/lib/notificationHelpers';

type FilterTab = 'all' | NotificationType;

export default function NotificationsPage() {
  const router = useRouter();
  
  // 🎨 純 UI state：通知列表（使用假資料）
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  
  // 🎨 純 UI state：當前選中的篩選 tab
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // 🎨 計算未讀數量
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 🎨 根據篩選條件過濾通知
  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  // 🎯 處理點擊通知：標記已讀 + 導頁 + 滾動（純前端）
  const handleNotificationClick = (notification: Notification) => {
    // 1. 標記為已讀（純 UI 更新）
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // 2. 使用統一的導航處理函數（純前端路由 + 滾動）
    handleNotificationNavigation(notification, router);
  };

  // 🎨 標記所有通知為已讀（純 UI 更新）
  const handleMarkAllRead = () => {
    console.log('mark all as read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // 🎨 篩選 tabs 配置
  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'message', label: '訊息' },
    { id: 'order', label: '接單' },
    { id: 'wishlist', label: '收藏' },
    { id: 'follow', label: '追蹤' },
    { id: 'system', label: '系統' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"
                aria-label="返回"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">通知</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">{unreadCount} 則未讀</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-3 py-2 hover:bg-blue-50 rounded-lg transition"
              >
                全部標記為已讀
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.id !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({notifications.filter(n => n.type === tab.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有通知</h3>
            <p className="text-sm text-gray-500">
              {activeFilter === 'all' ? '目前沒有任何通知' : `目前沒有「${filterTabs.find(t => t.id === activeFilter)?.label}」類型的通知`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border ${
                    !notification.isRead 
                      ? 'border-orange-200 bg-orange-50/30' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Avatar or Icon */}
                    {notification.avatarUrl ? (
                      <div className="relative shrink-0">
                        <img
                          src={notification.avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {!notification.isRead && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-full ${style.bgColor} flex items-center justify-center`}>
                          <NotificationIcon type={notification.type} className={`w-6 h-6 ${style.iconColor}`} />
                        </div>
                        {!notification.isRead && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-base font-bold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bgColor} ${style.textColor}`}>
                            {getNotificationTypeName(notification.type)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mb-2 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {notification.time}
                        </span>
                        {!notification.isRead && (
                          <span className="text-xs text-orange-600 font-semibold">
                            未讀
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="shrink-0 self-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

