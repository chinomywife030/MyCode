import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

export type PushTokenStatus = {
  granted: boolean;
  token: string | null;
  error?: string;
};

// 本地標記：避免重複註冊
let registrationInProgress = false;
let lastRegistrationTime = 0;
const REGISTRATION_COOLDOWN_MS = 5000; // 5 秒內不重複註冊

/**
 * 取得通知權限狀態
 */
export async function getNotificationPermission(): Promise<PushTokenStatus> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // 如果尚未請求權限，則請求
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        granted: false,
        token: null,
        error: '通知權限未授予',
      };
    }

    // 取得 push token
    // 嘗試從多個來源獲取 projectId
    let projectId: string | undefined;
    
    // 1. 從環境變數
    if (process.env.EXPO_PUBLIC_PROJECT_ID) {
      projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    }
    // 2. 從 Constants.expoConfig
    else if (Constants.expoConfig?.extra?.eas?.projectId) {
      projectId = Constants.expoConfig.extra.eas.projectId;
    }
    // 3. 從 Constants.manifest（舊版 Expo）
    else if ((Constants.manifest as any)?.extra?.eas?.projectId) {
      projectId = (Constants.manifest as any).extra.eas.projectId;
    }
    // 4. 從 Constants.manifest2（新版 Expo）
    else if ((Constants.manifest2 as any)?.extra?.eas?.projectId) {
      projectId = (Constants.manifest2 as any).extra.eas.projectId;
    }
    
    // EAS Build 必須傳入 projectId，否則會失敗
    if (!projectId) {
      console.error('[getNotificationPermission] No projectId found. EAS Build requires projectId.');
      return {
        granted: false,
        token: null,
        error: '缺少 projectId 設定（請檢查 app.json 的 extra.eas.projectId）',
      };
    }

    // 取得 push token（必須傳入 projectId）
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch (tokenError: any) {
      // 如果失敗，提供明確的錯誤訊息
      console.error('[getNotificationPermission] Failed to get push token:', tokenError);
      if (tokenError.message?.includes('projectId')) {
        throw new Error('需要設定 EXPO_PUBLIC_PROJECT_ID 環境變數或在 app.json 中配置 projectId');
      }
      throw tokenError;
    }

    return {
      granted: true,
      token: tokenData.data,
    };
  } catch (error: any) {
    console.error('[getNotificationPermission] Error:', error);
    return {
      granted: false,
      token: null,
      error: error.message || '取得通知權限失敗',
    };
  }
}

/**
 * 取得裝置 ID（用於識別裝置）
 */
async function getDeviceId(): Promise<string | null> {
  try {
    if (Device.isDevice) {
      // 使用 Device.modelName 或其他唯一標識
      return `${Platform.OS}-${Device.modelName || 'unknown'}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 註冊 Push Token 到 Supabase
 */
export async function registerPushToken(): Promise<{
  success: boolean;
  error?: string;
}> {
  // 防止重複註冊
  const now = Date.now();
  if (registrationInProgress || (now - lastRegistrationTime < REGISTRATION_COOLDOWN_MS)) {
    console.log('[registerPushToken] Skipping: registration in progress or too soon');
    return { success: false, error: '註冊進行中或過於頻繁' };
  }

  registrationInProgress = true;
  lastRegistrationTime = now;

  try {
    // 1. 取得通知權限和 token
    const permissionStatus = await getNotificationPermission();
    
    if (!permissionStatus.granted || !permissionStatus.token) {
      registrationInProgress = false;
      return {
        success: false,
        error: permissionStatus.error || '無法取得 push token',
      };
    }

    const token = permissionStatus.token;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceId = await getDeviceId();

    // 2. 從 session 獲取當前用戶（必須使用 getSession）
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      registrationInProgress = false;
      return {
        success: false,
        error: '請先登入後再註冊推播通知',
      };
    }
    
    if (!session || !session.user) {
      registrationInProgress = false;
      return {
        success: false,
        error: '請先登入後再註冊推播通知',
      };
    }
    
    const userId = session.user.id;

    // 3. Upsert 到 Supabase（使用 user_id,expo_push_token 作為唯一鍵）
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          expo_push_token: token,
          user_id: userId,
          platform: platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,expo_push_token',
        }
      );

    if (error) {
      console.error('[registerPushToken] Supabase error:', error);
      registrationInProgress = false;
      return {
        success: false,
        error: `註冊失敗：${error.message || '無法連接到伺服器'}`,
      };
    }

    console.log('[registerPushToken] Success:', { token: token.substring(0, 20) + '...', platform, userId });
    registrationInProgress = false;
    return { success: true };
  } catch (error: any) {
    console.error('[registerPushToken] Exception:', error);
    registrationInProgress = false;
    return {
      success: false,
      error: error.message || '註冊失敗：發生未知錯誤',
    };
  }
}

/**
 * 處理推送通知點擊事件（深鏈接）
 */
async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  try {
    const notification = response.notification;
    const data = notification.request.content.data;

    console.log('[handleNotificationResponse] Notification clicked:', data);

    // 更新未讀通知數（點擊通知時也增加，因為可能是背景收到的通知）
    try {
      const { incrementUnreadCount, isNotificationProcessed, markNotificationAsProcessed } = await import('./notifications/unread');
      
      // 取得通知 ID（用於去重）
      const notificationId: string = 
        (typeof notification.request.identifier === 'string' ? notification.request.identifier : '') ||
        (typeof data?.notificationId === 'string' ? data.notificationId : '') ||
        `${Date.now()}_${Math.random()}`;
      
      // 檢查是否已處理過（避免重複累加）
      const isProcessed = await isNotificationProcessed(notificationId);
      if (!isProcessed) {
        await incrementUnreadCount();
        await markNotificationAsProcessed(notificationId);
      }
    } catch (error) {
      // 未讀數更新失敗不影響導航
      console.warn('[handleNotificationResponse] Failed to update unread count:', error);
    }

    // 邊界情況：無 data 或 data 缺失
    if (!data) {
      console.warn('[handleNotificationResponse] No notification data, navigating to home');
      router.push('/');
      return;
    }

    // 使用共用的導頁函數
    const { getPushNotificationRoute } = await import('./notifications/navigation');
    const route = getPushNotificationRoute(data);

    if (route) {
      console.log('[handleNotificationResponse] Navigating to:', route);
      router.push(route as any);
    } else {
      // 無有效路由信息，導航到首頁
      console.warn('[handleNotificationResponse] No valid route found, navigating to home');
      router.push('/');
    }
  } catch (error) {
    console.error('[handleNotificationResponse] Exception:', error);
    // 發生錯誤時，導航到首頁
    router.push('/');
  }
}

// 防止重複註冊 notification handler
let notificationHandlerRegistered = false;

/**
 * 設定推送通知處理器（只註冊一次）
 */
function setupNotificationHandlers() {
  // 避免重複註冊
  if (notificationHandlerRegistered) {
    console.log('[setupNotificationHandlers] Handler already registered, skipping');
    return;
  }

  // 處理冷啟動時的初始通知（App 從關閉狀態被通知打開）
  // 注意：getLastNotificationResponseAsync 在 iOS 上可能不可用
  if (Platform.OS !== 'ios') {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          console.log('[setupNotificationHandlers] Handling initial notification response');
          handleNotificationResponse(response);
        }
      })
      .catch((error) => {
        // 靜默處理錯誤，不影響其他功能
        console.warn('[setupNotificationHandlers] Error getting last notification (non-critical):', error.message);
      });
  } else {
    // iOS 上不支援 getLastNotificationResponseAsync，跳過
    console.log('[setupNotificationHandlers] Skipping getLastNotificationResponseAsync on iOS (not supported)');
  }

  // 設定通知點擊處理器（前景和背景）
  Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // 設定通知接收處理器（App 在前台時）
  Notifications.setNotificationHandler({
    handleNotification: async (notification): Promise<Notifications.NotificationBehavior> => {
      // 更新未讀通知數（去重處理）
      try {
        const { incrementUnreadCount, isNotificationProcessed, markNotificationAsProcessed } = await import('./notifications/unread');
        
        // 取得通知 ID（用於去重）
        const notificationId: string = 
          (typeof notification.request.identifier === 'string' ? notification.request.identifier : '') ||
          (typeof notification.request.content.data?.notificationId === 'string' ? notification.request.content.data.notificationId : '') ||
          `${Date.now()}_${Math.random()}`;
        
        // 檢查是否已處理過（避免重複累加）
        const isProcessed = await isNotificationProcessed(notificationId);
        if (!isProcessed) {
          await incrementUnreadCount();
          await markNotificationAsProcessed(notificationId);
        }
      } catch (error) {
        // 未讀數更新失敗不影響通知顯示
        console.warn('[setupNotificationHandlers] Failed to update unread count:', error);
      }
      
      // 更新未讀訊息數（如果是 chat 通知）
      const notificationType = typeof notification.request.content.data?.type === 'string' 
        ? notification.request.content.data.type 
        : '';
      const isChatNotification = 
        notificationType === 'chat' || 
        notificationType === 'message' || 
        notificationType === 'chat_message' ||
        notificationType.toLowerCase().includes('chat') ||
        notificationType.toLowerCase().includes('message');
      
      if (isChatNotification) {
        try {
          const { 
            incrementMessagesUnreadCount, 
            isMessageNotificationProcessed, 
            markMessageNotificationAsProcessed 
          } = await import('./messages/unread');
          
          // 取得通知 ID（用於去重）
          const notificationId: string = 
            (typeof notification.request.identifier === 'string' ? notification.request.identifier : '') ||
            (typeof notification.request.content.data?.notificationId === 'string' ? notification.request.content.data.notificationId : '') ||
            `${Date.now()}_${Math.random()}`;
          
          // 檢查是否已處理過（避免重複累加）
          const isProcessed = await isMessageNotificationProcessed(notificationId);
          if (!isProcessed) {
            // Fallback 方法：收到 chat 通知時 +1
            // 注意：這是臨時 fallback，未來應該從 conversations 重新計算
            await incrementMessagesUnreadCount();
            await markMessageNotificationAsProcessed(notificationId);
          }
        } catch (error) {
          // 未讀訊息數更新失敗不影響通知顯示
          console.warn('[setupNotificationHandlers] Failed to update messages unread count:', error);
        }
      }
      
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });

  notificationHandlerRegistered = true;
  console.log('[setupNotificationHandlers] Notification handlers registered');
}

/**
 * 初始化 Push Notification（在 App 啟動時呼叫）
 */
export async function initializePushNotifications(): Promise<PushTokenStatus> {
  try {
    // Web 平台不支持推送通知
    if (Platform.OS === 'web') {
      console.log('[initializePushNotifications] Web platform, push notifications not supported');
      return {
        granted: false,
        token: null,
        error: 'Web 平台不支持推送通知',
      };
    }

    // 設定通知處理器（深鏈接）
    setupNotificationHandlers();

    // 檢查是否為實體裝置（模擬器可能無法取得 token）
    if (!Device.isDevice) {
      console.log('[initializePushNotifications] Not a physical device, skipping');
      return {
        granted: false,
        token: null,
        error: '僅支援實體裝置',
      };
    }

    // 註冊 token
    const result = await registerPushToken();
    
    if (result.success) {
      const permissionStatus = await getNotificationPermission();
      return permissionStatus;
    } else {
      return {
        granted: false,
        token: null,
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error('[initializePushNotifications] Exception:', error);
    return {
      granted: false,
      token: null,
      error: error.message || '初始化失敗',
    };
  }
}

