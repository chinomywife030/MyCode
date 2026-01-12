/**
 * 推送通知 Token 註冊
 * 用於在 App 啟動時請求權限、取得 Expo Push Token，並註冊到 Server
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// API Base URL（從環境變數或預設值）
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://bangbuy.app';

/**
 * 註冊推送通知並取得 Expo Push Token
 * @returns Expo Push Token (string) 或 null
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Web 平台不支持推送通知
    if (Platform.OS === 'web') {
      console.log('[registerForPushNotificationsAsync] Web platform, push notifications not supported');
      return null;
    }

    // 檢查是否為實體裝置
    if (!Device.isDevice) {
      console.log('[registerForPushNotificationsAsync] Not a physical device, skipping');
      return null;
    }

    // 請求通知權限
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[registerForPushNotificationsAsync] Notification permission not granted');
      return null;
    }

    // 取得 projectId（從 app.json 的 extra.eas.projectId）
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

    if (!projectId) {
      console.error('[registerForPushNotificationsAsync] No projectId found in app.json');
      return null;
    }

    // 取得 Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    return token;
  } catch (error: any) {
    console.error('[registerForPushNotificationsAsync] Error:', error);
    return null;
  }
}

/**
 * 將 Expo Push Token 註冊到 Server
 * @param token Expo Push Token
 * @returns 是否成功
 */
export async function registerPushTokenToServer(token: string): Promise<boolean> {
  try {
    // 獲取當前用戶 ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('[registerPushTokenToServer] No user logged in, skipping registration');
      return false;
    }

    const userId = user.id;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    console.log('[registerPushTokenToServer] Registering token for user:', userId, 'platform:', platform);

    // 調用 Server API
    const response = await fetch(`${API_BASE_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userId,
        platform,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[registerPushTokenToServer] API error:', result);
      return false;
    }

    console.log('[registerPushTokenToServer] Success:', result);
    return true;
  } catch (error: any) {
    console.error('[registerPushTokenToServer] Error:', error);
    return false;
  }
}

/**
 * 完整的推送通知註冊流程
 * 1. 取得 Expo Push Token
 * 2. 註冊到 Server
 * @returns Expo Push Token (string) 或 null
 */
export async function registerPushNotificationsComplete(): Promise<string | null> {
  try {
    // 1. 取得 token
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      return null;
    }

    console.log('Expo Push Token:', token);

    // 2. 註冊到 Server（非阻塞，失敗不影響返回）
    registerPushTokenToServer(token).catch((error) => {
      console.warn('[registerPushNotificationsComplete] Failed to register to server:', error);
    });

    return token;
  } catch (error: any) {
    console.error('[registerPushNotificationsComplete] Error:', error);
    return null;
  }
}

