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
    
    // 如果沒有 projectId，嘗試不傳入（某些情況下 Expo 可以自動推斷）
    let tokenData;
    try {
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        // 嘗試不傳入 projectId（可能會失敗，但先試試）
        console.warn('[getNotificationPermission] No projectId found, attempting without it');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
    } catch (tokenError: any) {
      // 如果失敗，提供明確的錯誤訊息
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

    // 2. 嘗試獲取當前用戶（如果已登入）
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (authError) {
      // 未登入，允許匿名註冊
      console.log('[registerPushToken] No user session, registering anonymously');
    }

    // 3. Upsert 到 Supabase（使用 fcm_token 作為唯一鍵）
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          fcm_token: token,
          user_id: userId,
          platform: platform,
          device_id: deviceId,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'fcm_token',
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
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const notification = response.notification;
  const data = notification.request.content.data;

  console.log('[handleNotificationResponse] Notification clicked:', data);

  // 處理深鏈接
  if (data?.type === 'NEW_REPLY' && data?.wishId) {
    // 導航到對應的 wish 詳情頁
    router.push(`/wish/${data.wishId}`);
  } else if (data?.url) {
    // 如果有 url 字段，使用它（Expo Router 會自動處理）
    router.push(data.url as any);
  } else if (data?.wishId) {
    // 備用：如果有 wishId，直接導航
    router.push(`/wish/${data.wishId}`);
  }
}

/**
 * 設定推送通知處理器
 */
function setupNotificationHandlers() {
  // 設定通知點擊處理器
  Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  // 設定通知接收處理器（App 在前台時）
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * 初始化 Push Notification（在 App 啟動時呼叫）
 */
export async function initializePushNotifications(): Promise<PushTokenStatus> {
  try {
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

