/**
 * 未讀訊息數管理
 * 使用 AsyncStorage 做本地存取，未來可接後端 API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MESSAGES_UNREAD_COUNT_KEY = 'bangbuy_unread_messages_count';
const PROCESSED_MESSAGE_NOTIFICATION_IDS_KEY = 'bangbuy_processed_message_notification_ids';

/**
 * 取得未讀訊息數
 */
export async function getMessagesUnreadCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(MESSAGES_UNREAD_COUNT_KEY);
    if (value === null) {
      return 0;
    }
    const count = parseInt(value, 10);
    return isNaN(count) ? 0 : Math.max(0, count);
  } catch (error) {
    console.error('[getMessagesUnreadCount] Error:', error);
    return 0;
  }
}

/**
 * 設定未讀訊息數
 */
export async function setMessagesUnreadCount(count: number): Promise<void> {
  try {
    const safeCount = Math.max(0, Math.floor(count));
    await AsyncStorage.setItem(MESSAGES_UNREAD_COUNT_KEY, safeCount.toString());
  } catch (error) {
    console.error('[setMessagesUnreadCount] Error:', error);
  }
}

/**
 * 清除未讀訊息數
 */
export async function clearMessagesUnreadCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MESSAGES_UNREAD_COUNT_KEY);
  } catch (error) {
    console.error('[clearMessagesUnreadCount] Error:', error);
  }
}

/**
 * 取得已處理的訊息通知 ID 列表（用於去重）
 */
async function getProcessedMessageNotificationIds(): Promise<Set<string>> {
  try {
    const value = await AsyncStorage.getItem(PROCESSED_MESSAGE_NOTIFICATION_IDS_KEY);
    if (value === null) {
      return new Set();
    }
    const ids = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (error) {
    console.error('[getProcessedMessageNotificationIds] Error:', error);
    return new Set();
  }
}

/**
 * 儲存已處理的訊息通知 ID 列表
 */
async function saveProcessedMessageNotificationIds(ids: Set<string>): Promise<void> {
  try {
    // 只保留最後 100 個 ID
    const idsArray = Array.from(ids).slice(-100);
    await AsyncStorage.setItem(PROCESSED_MESSAGE_NOTIFICATION_IDS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('[saveProcessedMessageNotificationIds] Error:', error);
  }
}

/**
 * 檢查訊息通知是否已處理過（用於去重）
 */
export async function isMessageNotificationProcessed(notificationId: string): Promise<boolean> {
  try {
    const processedIds = await getProcessedMessageNotificationIds();
    return processedIds.has(notificationId);
  } catch (error) {
    console.error('[isMessageNotificationProcessed] Error:', error);
    return false;
  }
}

/**
 * 標記訊息通知為已處理（用於去重）
 */
export async function markMessageNotificationAsProcessed(notificationId: string): Promise<void> {
  try {
    const processedIds = await getProcessedMessageNotificationIds();
    processedIds.add(notificationId);
    await saveProcessedMessageNotificationIds(processedIds);
  } catch (error) {
    console.error('[markMessageNotificationAsProcessed] Error:', error);
  }
}

/**
 * 從實際對話列表計算未讀數（優先使用此方法）
 * 若 conversation 列表已有 unread_count，直接 sum 全部 conversations 的 unread_count
 */
export async function syncMessagesUnreadCountFromConversations(
  conversations: Array<{ unreadCount?: number }>
): Promise<number> {
  try {
    // 計算總未讀數：sum 所有 conversations 的 unreadCount
    const totalUnread = conversations.reduce((sum, conv) => {
      const unread = conv.unreadCount || 0;
      return sum + unread;
    }, 0);
    
    await setMessagesUnreadCount(totalUnread);
    return totalUnread;
  } catch (error) {
    console.error('[syncMessagesUnreadCountFromConversations] Error:', error);
    return 0;
  }
}

/**
 * 增加未讀訊息數（Fallback 方法：收到 chat 通知時使用）
 * 注意：這是臨時 fallback，未來應該從 conversations 重新計算
 */
export async function incrementMessagesUnreadCount(): Promise<void> {
  try {
    const current = await getMessagesUnreadCount();
    await setMessagesUnreadCount(current + 1);
  } catch (error) {
    console.error('[incrementMessagesUnreadCount] Error:', error);
  }
}
