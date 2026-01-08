/**
 * @bangbuy/core - Supabase Client 接口
 * 
 * 使用依賴注入模式，由 Web 或 Mobile 端提供具體的 Supabase client
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// 全域 client 實例
let _supabaseClient: SupabaseClient | null = null;
let _apiBaseUrl: string | null = null;
let _getAuthToken: (() => Promise<string | null>) | null = null;

/**
 * 設定 Supabase Client（由 Web 或 Mobile 在初始化時呼叫）
 */
export function setSupabaseClient(client: SupabaseClient): void {
  _supabaseClient = client;
}

/**
 * 取得 Supabase Client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    throw new Error(
      '[@bangbuy/core] Supabase client not initialized. ' +
      'Please call setSupabaseClient() before using core functions.'
    );
  }
  return _supabaseClient;
}

/**
 * 設定 API Base URL（用於寫入操作的 API 呼叫）
 */
export function setApiBaseUrl(url: string): void {
  _apiBaseUrl = url;
}

/**
 * 取得 API Base URL
 */
export function getApiBaseUrl(): string | null {
  return _apiBaseUrl;
}

/**
 * 設定取得 Auth Token 的函式（用於 API 呼叫時的認證）
 */
export function setGetAuthToken(fn: () => Promise<string | null>): void {
  _getAuthToken = fn;
}

/**
 * 取得 Auth Token
 */
export async function getAuthToken(): Promise<string | null> {
  if (_getAuthToken) {
    return _getAuthToken();
  }
  // 預設從 Supabase client 取得
  if (_supabaseClient) {
    const { data: { session } } = await _supabaseClient.auth.getSession();
    return session?.access_token || null;
  }
  return null;
}

/**
 * 檢查 client 是否已初始化
 */
export function isClientInitialized(): boolean {
  return _supabaseClient !== null;
}





