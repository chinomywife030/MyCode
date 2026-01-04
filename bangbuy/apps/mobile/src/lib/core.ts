/**
 * 初始化 @bangbuy/core
 * 
 * 在 App 啟動時呼叫一次，設定 Supabase client
 */

import { setSupabaseClient, setApiBaseUrl, isClientInitialized } from '@bangbuy/core';
import { supabase } from './supabase';

let initialized = false;

/**
 * 初始化 core layer
 * 
 * @returns 是否成功初始化
 */
export function initializeCore(): boolean {
  if (initialized) {
    return true;
  }

  try {
    // 設定 Supabase client
    setSupabaseClient(supabase);

    // 設定 API Base URL（用於寫入操作的 API 呼叫）
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (apiBaseUrl) {
      setApiBaseUrl(apiBaseUrl);
    }

    initialized = true;
    console.log('[initializeCore] Core layer initialized successfully');
    return true;
  } catch (error) {
    console.error('[initializeCore] Failed to initialize core layer:', error);
    return false;
  }
}

/**
 * 確保 core 已初始化
 */
export function ensureCoreInitialized(): void {
  if (!initialized) {
    initializeCore();
  }
}

/**
 * 檢查 core 是否已初始化
 */
export function isCoreInitialized(): boolean {
  return initialized && isClientInitialized();
}




