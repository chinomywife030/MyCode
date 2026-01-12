/**
 * 未讀通知數管理
 * 使用 AsyncStorage 做本地存取，未來可接後端 API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNREAD_COUNT_KEY = 'bangbuy_unread_notification_count';
const PROCESSED_NOTIFICATION_IDS_KEY = 'bangbuy_processed_notification_ids';

/**
 * 取得未讀通知數
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(UNREAD_COUNT_KEY);
    if (value === null) {
      return 0;
    }
    const count = parseInt(value, 10);
    return isNaN(count) ? 0 : Math.max(0, count);
  } catch (error) {
    console.error('[getUnreadCount] Error:', error);
    return 0;
  }
}

/**
 * 設定未讀通知數
 */
export async function setUnreadCount(count: number): Promise<void> {
  try {
    const safeCount = Math.max(0, Math.floor(count));
    await AsyncStorage.setItem(UNREAD_COUNT_KEY, safeCount.toString());
  } catch (error) {
    console.error('[setUnreadCount] Error:', error);
  }
}

/**
 * 增加未讀通知數
 */
export async function incrementUnreadCount(): Promise<void> {
  try {
    const current = await getUnreadCount();
    await setUnreadCount(current + 1);
  } catch (error) {
    console.error('[incrementUnreadCount] Error:', error);
  }
}

/**
 * 清除未讀通知數
 */
export async function clearUnreadCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(UNREAD_COUNT_KEY);
  } catch (error) {
    console.error('[clearUnreadCount] Error:', error);
  }
}

/**
 * 取得已處理的通知 ID 列表（用於去重）
 */
async function getProcessedNotificationIds(): Promise<Set<string>> {
  try {
    const value = await AsyncStorage.getItem(PROCESSED_NOTIFICATION_IDS_KEY);
    if (value === null) {
      return new Set();
    }
    const ids = JSON.parse(value);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (error) {
    console.error('[getProcessedNotificationIds] Error:', error);
    return new Set();
  }
}

/**
 * 儲存已處理的通知 ID 列表
 */
async function saveProcessedNotificationIds(ids: Set<string>): Promise<void> {
  try {
    // 只保留最後 100 個 ID
    const idsArray = Array.from(ids).slice(-100);
    await AsyncStorage.setItem(PROCESSED_NOTIFICATION_IDS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('[saveProcessedNotificationIds] Error:', error);
  }
}

/**
 * 檢查通知是否已處理過（用於去重）
 */
export async function isNotificationProcessed(notificationId: string): Promise<boolean> {
  try {
    const processedIds = await getProcessedNotificationIds();
    return processedIds.has(notificationId);
  } catch (error) {
    console.error('[isNotificationProcessed] Error:', error);
    return false;
  }
}

/**
 * 標記通知為已處理（用於去重）
 */
export async function markNotificationAsProcessed(notificationId: string): Promise<void> {
  try {
    const processedIds = await getProcessedNotificationIds();
    processedIds.add(notificationId);
    await saveProcessedNotificationIds(processedIds);
  } catch (error) {
    console.error('[markNotificationAsProcessed] Error:', error);
  }
}

/**
 * 從實際通知列表計算未讀數（未來接後端 API 時使用）
 * 目前先用本地計數，未來可以改為從 getNotifications() 計算 is_read=false 的數量
 */
export async function syncUnreadCountFromNotifications(): Promise<number> {
  try {
    // 未來實作：從 getNotifications() 取得通知列表，計算 is_read=false 的數量
    // const notifications = await getNotifications();
    // const unreadCount = notifications.filter(n => !n.is_read).length;
    // await setUnreadCount(unreadCount);
    // return unreadCount;
    
    // 目前返回本地儲存的計數
    return await getUnreadCount();
  } catch (error) {
    console.error('[syncUnreadCountFromNotifications] Error:', error);
    return 0;
  }
}
