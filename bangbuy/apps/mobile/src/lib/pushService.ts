/**
 * Push Notification Service
 * 最小侵入的推播通知服務
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let tokenRegistrationInProgress = false;

/**
 * 請求推播權限並取得 Expo Push Token
 */
export async function requestPushPermission(): Promise<{
  granted: boolean;
  token: string | null;
  error?: string;
}> {
  try {
    // Web 平台不支持
    if (Platform.OS === 'web') {
      return { granted: false, token: null, error: 'Web 平台不支持' };
    }

    // 檢查是否為實體裝置
    if (!Device.isDevice) {
      return { granted: false, token: null, error: '僅支援實體裝置' };
    }

    // 請求權限
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return { granted: false, token: null, error: '通知權限未授予' };
    }

    // 取得 projectId（EAS Build 必須傳入）
    let projectId: string | undefined;
    if (process.env.EXPO_PUBLIC_PROJECT_ID) {
      projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    } else if (Constants.expoConfig?.extra?.eas?.projectId) {
      projectId = Constants.expoConfig.extra.eas.projectId;
    }

    // EAS Build 必須傳入 projectId，否則會失敗
    if (!projectId) {
      console.error('[pushService] No projectId found. EAS Build requires projectId.');
      return {
        granted: false,
        token: null,
        error: '缺少 projectId 設定（請檢查 app.json 的 extra.eas.projectId）',
      };
    }

    // 取得 push token（必須傳入 projectId）
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    return {
      granted: true,
      token: tokenData.data,
    };
  } catch (error: any) {
    console.error('[pushService] Error getting push token:', error);
    return {
      granted: false,
      token: null,
      error: error.message || '取得推播 token 失敗',
    };
  }
}

/**
 * 註冊 Push Token 到 Supabase（僅在登入後呼叫）
 */
export async function registerPushTokenToSupabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  // 防止重複註冊
  if (tokenRegistrationInProgress) {
    return { success: false, error: '註冊進行中' };
  }

  tokenRegistrationInProgress = true;

  try {
    // Session Guard：先檢查 session，避免 AuthSessionMissingError
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // 不記錄 AuthSessionMissingError（這是正常情況）
      if (!sessionError.message?.includes('Auth session missing') && 
          !sessionError.message?.includes('AuthSessionMissingError')) {
        console.error('[pushService] Session error:', sessionError);
      }
      tokenRegistrationInProgress = false;
      return { success: false, error: '請先登入' };
    }
    
    if (!session) {
      // 沒有 session，表示未登入
      tokenRegistrationInProgress = false;
      return { success: false, error: '請先登入' };
    }
    
    // 確認 session 存在後，獲取用戶資訊
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      // 如果錯誤是 session 相關，直接返回（不 throw）
      if (userError.message?.includes('Auth session missing') || 
          userError.message?.includes('AuthSessionMissingError')) {
        tokenRegistrationInProgress = false;
        return { success: false, error: '請先登入' };
      }
      console.error('[pushService] Get user error:', userError);
      tokenRegistrationInProgress = false;
      return { success: false, error: '請先登入' };
    }
    
    if (!user) {
      tokenRegistrationInProgress = false;
      return { success: false, error: '請先登入' };
    }

    // 2. 取得 push token
    const permissionResult = await requestPushPermission();
    if (!permissionResult.granted || !permissionResult.token) {
      tokenRegistrationInProgress = false;
      return { success: false, error: permissionResult.error || '無法取得 push token' };
    }

    const token = permissionResult.token;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // 3. 檢查 token 是否已存在
    const { data: existingToken } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('token', token)
      .single();

    // 4. 如果不存在，則插入
    if (!existingToken) {
      const { error: insertError } = await supabase
        .from('push_tokens')
        .insert({
          user_id: user.id,
          token: token,
          platform: platform,
        });

      if (insertError) {
        console.error('[pushService] Failed to insert token:', insertError);
        tokenRegistrationInProgress = false;
        return { success: false, error: `註冊失敗：${insertError.message}` };
      }
    }

    console.log('[pushService] Push token registered successfully');
    tokenRegistrationInProgress = false;
    return { success: true };
  } catch (error: any) {
    // Session Guard：捕獲 AuthSessionMissingError，不 throw
    if (error?.message?.includes('Auth session missing') || 
        error?.name === 'AuthSessionMissingError' ||
        error?.message?.includes('AuthSessionMissingError')) {
      // 這是正常情況（未登入或 session 已失效），不需要記錄為錯誤
      tokenRegistrationInProgress = false;
      return { success: false, error: '請先登入' };
    }
    console.error('[pushService] Exception:', error);
    tokenRegistrationInProgress = false;
    return { success: false, error: error.message || '註冊失敗' };
  }
}

/**
 * 初始化推播通知（在 App 啟動時呼叫）
 * Session Guard：只檢查 session，不嘗試註冊 token（由其他地方處理）
 */
export async function initializePushService(): Promise<void> {
  try {
    // Session Guard：先檢查 session，避免 AuthSessionMissingError
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // 不記錄 AuthSessionMissingError（這是正常情況）
      if (!sessionError.message?.includes('Auth session missing') && 
          !sessionError.message?.includes('AuthSessionMissingError')) {
        console.warn('[pushService] Session error:', sessionError);
      }
      return;
    }
    
    if (!session) {
      // 沒有 session，表示未登入，不註冊 token
      return;
    }
    
    // 有 session 時，由 RootLayout 或其他地方負責註冊 token
    // 這裡不主動註冊，避免在初始化時觸發錯誤
  } catch (error: any) {
    // Session Guard：捕獲 AuthSessionMissingError，不 throw
    if (error?.message?.includes('Auth session missing') || 
        error?.name === 'AuthSessionMissingError' ||
        error?.message?.includes('AuthSessionMissingError')) {
      // 這是正常情況（未登入），不需要記錄為錯誤
      return;
    }
    console.warn('[pushService] Failed to initialize:', error);
  }
}


