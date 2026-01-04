/**
 * 最小可用的推送通知 Token 註冊
 * 僅用於在 App 啟動時請求權限並取得 Expo Push Token
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

