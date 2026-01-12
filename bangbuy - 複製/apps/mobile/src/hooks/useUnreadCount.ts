/**
 * 未讀通知數 Hook
 * 提供未讀數狀態、刷新、清除功能
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getUnreadCount, clearUnreadCount, syncUnreadCountFromNotifications } from '@/src/lib/notifications/unread';

/**
 * 未讀通知數 Hook
 * 
 * @returns { count, refresh, clear, isLoading }
 */
export function useUnreadCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // 載入未讀數
  const loadUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const unreadCount = await getUnreadCount();
      setCount(unreadCount);
      
      // 同步更新 app icon badge
      try {
        await Notifications.setBadgeCountAsync(unreadCount);
      } catch (badgeError) {
        // badge 更新失敗不影響功能
        console.warn('[useUnreadCount] Failed to update app badge:', badgeError);
      }
    } catch (error) {
      console.error('[useUnreadCount] Error loading unread count:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新未讀數（從本地或未來從 API）
  const refresh = useCallback(async () => {
    await loadUnreadCount();
  }, [loadUnreadCount]);

  // 清除未讀數
  const clear = useCallback(async () => {
    try {
      await clearUnreadCount();
      setCount(0);
      
      // 注意：app icon badge 應該顯示「總未讀 = notifications + messages」
      // 這裡只清除 notifications 部分，總 badge 應該在更高層級計算
    } catch (error) {
      console.error('[useUnreadCount] Error clearing unread count:', error);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // 監聽 AppState 變化（背景回到前景時刷新）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App 從背景回到前景時，刷新未讀數
        refresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  // 監聽通知接收（前景收到通知時更新）
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      // 前景收到通知時，增加未讀數
      refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return {
    count,
    refresh,
    clear,
    isLoading,
  };
}
