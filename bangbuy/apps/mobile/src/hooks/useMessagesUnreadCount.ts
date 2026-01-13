/**
 * 未讀訊息數 Hook
 * 提供未讀數狀態、刷新、清除功能
 */

import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getMessagesUnreadCount,
  clearMessagesUnreadCount,
  syncMessagesUnreadCountFromConversations,
} from '@/src/lib/messages/unread';
import { getConversations } from '@/src/lib/messaging';

/**
 * 未讀訊息數 Hook
 * 
 * @returns { count, refresh, clear, isLoading }
 */
export function useMessagesUnreadCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // 載入未讀數（從 conversations 計算）
  const loadUnreadCount = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 優先方法：從 conversations 列表計算未讀數
      try {
        const conversations = await getConversations();
        const totalUnread = await syncMessagesUnreadCountFromConversations(conversations);
        setCount(totalUnread);
      } catch (error) {
        // 如果取得 conversations 失敗，fallback 到本地儲存的計數
        console.warn('[useMessagesUnreadCount] Failed to fetch conversations, using local count:', error);
        const localCount = await getMessagesUnreadCount();
        setCount(localCount);
      }
    } catch (error) {
      console.error('[useMessagesUnreadCount] Error loading unread count:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新未讀數（從 conversations 重新計算）
  const refresh = useCallback(async () => {
    await loadUnreadCount();
  }, [loadUnreadCount]);

  // 清除未讀數
  const clear = useCallback(async () => {
    try {
      await clearMessagesUnreadCount();
      setCount(0);
    } catch (error) {
      console.error('[useMessagesUnreadCount] Error clearing unread count:', error);
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
      subscription?.remove?.();
    };
  }, [refresh]);

  // 監聽通知接收（前景收到 chat 通知時更新）
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const notificationType = notification.request.content.data?.type || '';
      const isChatNotification = 
        notificationType === 'chat' || 
        notificationType === 'message' || 
        notificationType === 'chat_message' ||
        notificationType?.toLowerCase().includes('chat') ||
        notificationType?.toLowerCase().includes('message');
      
      if (isChatNotification) {
        // 前景收到 chat 通知時，刷新未讀數（會從 conversations 重新計算）
        refresh();
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, [refresh]);

  return {
    count,
    refresh,
    clear,
    isLoading,
  };
}
