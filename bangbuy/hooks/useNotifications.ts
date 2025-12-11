'use client';

import { useState, useCallback } from 'react';
import { MOCK_NOTIFICATIONS } from '@/types/notifications';
import type { Notification } from '@/types/notifications';

/**
 * 🎨 useNotifications Hook
 * 
 * 純前端的通知狀態管理（使用假資料）
 * 用於在多個 component 之間共享通知狀態和未讀數量
 * 
 * ⚠️ 注意：這只是 UI 層的 local state，不涉及任何資料庫操作
 */
export function useNotifications() {
  // 🎨 純 UI state：通知列表（使用假資料）
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  // 🎨 計算未讀數量
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // 🎨 標記單一通知為已讀（純 UI 更新）
  const markAsRead = useCallback((notificationId: string | number) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  // 🎨 標記所有通知為已讀（純 UI 更新）
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  };
}


