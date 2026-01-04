import * as Notifications from "expo-notifications";
import { router } from "expo-router";

/**
 * 通知 data 格式定義
 */
type PushData = {
  // 格式 A: 直接提供 URL
  url?: string;
  
  // 格式 B: screen + params
  screen?: string;
  params?: Record<string, any>;
  
  // 去重用：notificationId（優先）或使用 identifier
  notificationId?: string;
  
  // 兼容舊格式
  type?: string;
  chatId?: string;
  wishId?: string;
};

/**
 * 已處理的通知 ID 集合（用於去重）
 */
const processedNotificationIds = new Set<string>();

/**
 * 驗證 URL 是否為站內路徑（安全檢查）
 * @param url 要驗證的 URL
 * @returns 是否為合法的站內路徑
 */
function isValidInternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const trimmedUrl = url.trim();
  
  // 必須以 "/" 開頭（站內路徑）
  if (!trimmedUrl.startsWith('/')) {
    console.warn('[notificationRouter] Invalid URL (not internal):', trimmedUrl);
    return false;
  }
  
  // 不允許外部協議（http://, https://, bangbuy:// 等）
  if (trimmedUrl.includes('://')) {
    console.warn('[notificationRouter] Invalid URL (contains protocol):', trimmedUrl);
    return false;
  }
  
  return true;
}

/**
 * 從 data 解析出 URL
 * @param data 通知 data
 * @returns 解析出的 URL，若無法解析則返回 null
 */
function parseUrlFromData(data: PushData): string | null {
  // 格式 A: 直接使用 data.url
  if (data.url && typeof data.url === 'string') {
    const url = data.url.trim();
    if (isValidInternalUrl(url)) {
      return url;
    }
    return null;
  }
  
  // 格式 B: 從 screen + params 構建 URL
  if (data.screen && typeof data.screen === 'string') {
    const screen = data.screen.trim();
    if (!screen) {
      return null;
    }
    
    // 確保 screen 是站內路徑
    const screenPath = screen.startsWith('/') ? screen : `/${screen}`;
    if (!isValidInternalUrl(screenPath)) {
      return null;
    }
    
    // 構建 query string（如果有 params）
    if (data.params && typeof data.params === 'object') {
      const queryParams = new URLSearchParams();
      Object.entries(data.params).forEach(([key, value]) => {
        if (value != null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      return queryString ? `${screenPath}?${queryString}` : screenPath;
    }
    
    return screenPath;
  }
  
  // 兼容舊格式：chatId
  if (data.chatId && typeof data.chatId === 'string') {
    const chatId = data.chatId.trim();
    if (chatId) {
      return `/chat/${chatId}`;
    }
  }
  
  // 兼容舊格式：wishId
  if (data.wishId && typeof data.wishId === 'string') {
    const wishId = data.wishId.trim();
    if (wishId) {
      return `/wish/${wishId}`;
    }
  }
  
  return null;
}

/**
 * 獲取通知的唯一標識符（用於去重）
 * @param response 通知響應
 * @param data 通知 data
 * @returns 唯一標識符
 */
function getNotificationId(
  response: Notifications.NotificationResponse,
  data: PushData
): string {
  // 優先使用 data.notificationId
  if (data.notificationId && typeof data.notificationId === 'string') {
    return data.notificationId.trim();
  }
  
  // 其次使用 request.identifier
  const identifier = response?.notification?.request?.identifier;
  if (identifier && typeof identifier === 'string') {
    return identifier;
  }
  
  // 最後使用 timestamp + 隨機數（fallback）
  return `fallback_${Date.now()}_${Math.random()}`;
}

/**
 * 處理通知響應並導航到對應頁面
 * @param response 通知響應
 */
export function routeFromNotificationResponse(
  response: Notifications.NotificationResponse
): void {
  try {
    const data = response?.notification?.request?.content?.data as PushData | undefined;
    
    // 安全性檢查：如果沒有 data，直接返回
    if (!data) {
      if (__DEV__) {
        console.warn('[notificationRouter] No notification data found');
      }
      return;
    }
    
    // 獲取通知 ID（用於去重）
    const notificationId = getNotificationId(response, data);
    
    // 去重檢查：如果已經處理過這個通知，直接返回
    if (processedNotificationIds.has(notificationId)) {
      if (__DEV__) {
        console.log('[notificationRouter] Notification already processed, skipping:', notificationId);
      }
      return;
    }
    
    // 解析 URL
    const url = parseUrlFromData(data);
    
    // 如果無法解析 URL，直接返回
    if (!url) {
      if (__DEV__) {
        console.warn('[notificationRouter] Cannot parse URL from data:', data);
      }
      return;
    }
    
    // 標記為已處理
    processedNotificationIds.add(notificationId);
    
    // 限制去重集合大小（避免記憶體洩漏）
    if (processedNotificationIds.size > 100) {
      const firstId = processedNotificationIds.values().next().value;
      processedNotificationIds.delete(firstId);
    }
    
    // 使用 expo-router 導航
    if (__DEV__) {
      console.log('[notificationRouter] Navigating to:', url, 'notificationId:', notificationId);
    }
    
    router.push(url as any);
  } catch (error) {
    console.error('[notificationRouter] Error processing notification:', error);
  }
}

