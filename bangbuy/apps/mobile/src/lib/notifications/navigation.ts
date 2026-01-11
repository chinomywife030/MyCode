import { router } from 'expo-router';
import { type Notification } from '../notifications';

/**
 * 通知導頁路由配置
 */
export interface NotificationRoute {
  pathname: string;
  params?: Record<string, any>;
}

/**
 * 從通知資料中解析出導頁路由
 * 
 * @param data 通知的 data 欄位（Record<string, any>）
 * @param type 通知類型（可選，用於輔助判斷）
 * @returns 路由路徑字串，若無法解析則返回 null
 */
export function getNotificationRoute(
  data: Record<string, any> | null | undefined,
  type?: string
): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // 優先處理聊天室通知（conversationId）
  const conversationId = 
    data.conversationId || 
    data.conversation_id || 
    (data as any).conversationId;

  if (conversationId && typeof conversationId === 'string') {
    const cleanId = conversationId.trim();
    // UUID 驗證
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanId)) {
      return `/chat/${cleanId}`;
    } else {
      console.warn('[getNotificationRoute] Invalid conversationId format:', cleanId);
    }
  }

  // 處理 Wish 相關通知（wishId）
  const wishId = 
    data.wishId || 
    data.wish_id || 
    (data as any).wishId;

  if (wishId && typeof wishId === 'string') {
    const cleanId = wishId.trim();
    // UUID 驗證
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanId)) {
      return `/wish/${cleanId}`;
    } else {
      console.warn('[getNotificationRoute] Invalid wishId format:', cleanId);
    }
  }

  // 從 URL 中解析 wishId（例如：/wish/123）
  if (data.url && typeof data.url === 'string') {
    const urlMatch = data.url.match(/\/wish\/([^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      const extractedWishId = urlMatch[1].trim();
      return `/wish/${extractedWishId}`;
    }
    
    // 如果 URL 是完整路徑，直接使用
    if (data.url.startsWith('/')) {
      return data.url;
    }
  }

  // 根據通知類型推斷（fallback）
  if (type) {
    const typeLower = type.toLowerCase();
    
    // Wish 相關類型
    if (
      typeLower.includes('wish') || 
      typeLower.includes('quote') || 
      typeLower.includes('reply') ||
      typeLower === 'new_reply'
    ) {
      // 如果類型是 wish 相關但沒有 wishId，記錄警告
      console.warn('[getNotificationRoute] Wish-related notification but no wishId found:', { type, data });
    }
    
    // Chat 相關類型
    if (typeLower.includes('chat') || typeLower.includes('message')) {
      // 如果類型是 chat 相關但沒有 conversationId，記錄警告
      console.warn('[getNotificationRoute] Chat-related notification but no conversationId found:', { type, data });
    }
  }

  return null;
}

/**
 * 處理通知點擊導頁
 * 
 * @param notification 通知物件
 * @param customRouter 可選的自定義 router（預設使用 expo-router 的 router）
 * @returns 是否成功導頁
 */
export async function handleNotificationPress(
  notification: Notification,
  customRouter?: any
): Promise<boolean> {
  const activeRouter = customRouter || router;
  const route = getNotificationRoute(notification.data, notification.type);

  if (!route) {
    console.warn(
      '[handleNotificationPress] No valid route found for notification:',
      notification.id,
      notification.type,
      notification.data
    );
    return false;
  }

  try {
    console.log('[handleNotificationPress] Navigating to:', route);
    activeRouter.push(route as any);
    return true;
  } catch (error) {
    console.error('[handleNotificationPress] Navigation error:', error);
    return false;
  }
}

/**
 * 從推播通知的 data 解析導頁路由
 * （用於處理從推播點進 App 的情況）
 * 
 * @param notificationData 推播通知的 data 物件
 * @returns 路由路徑字串，若無法解析則返回 null
 */
export function getPushNotificationRoute(
  notificationData: Record<string, any> | null | undefined
): string | null {
  return getNotificationRoute(notificationData);
}
