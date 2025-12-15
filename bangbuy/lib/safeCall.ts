'use client';

/**
 * 🛡️ 安全的 Supabase 呼叫層（帶重試和 Token 刷新）
 * 
 * 功能：
 * 1. 自動處理 JWT 過期
 * 2. 遇到 auth 錯誤時嘗試刷新 session
 * 3. 刷新失敗則登出
 * 4. 統一錯誤處理
 */

import { supabase } from '@/lib/supabase';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[safeCall] ${message}`, data || '');
  }
};

// ============================================
// 錯誤檢測
// ============================================

const AUTH_ERROR_PATTERNS = [
  'JWT expired',
  'invalid JWT',
  'Invalid Refresh Token',
  'Not authenticated',
  'PGRST301',
  'Invalid API key',
  'Invalid login credentials',
  'session_not_found',
  'refresh_token_not_found',
];

const AUTH_ERROR_CODES = [401, 403];

function isAuthError(error: any): boolean {
  if (!error) return false;

  // 檢查狀態碼
  const status = error.status || error.code;
  if (AUTH_ERROR_CODES.includes(Number(status))) {
    return true;
  }

  // 檢查錯誤訊息
  const message = String(error.message || error.msg || error.error || '');
  return AUTH_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const message = String(error.message || '');
  return (
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('net::ERR_') ||
    message.includes('NetworkError') ||
    error.name === 'TypeError'
  );
}

// ============================================
// Session 刷新
// ============================================

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  // 避免多個請求同時刷新
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      log('Attempting to refresh session...');
      
      // 先檢查是否有 session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        log('No session found');
        return false;
      }

      // 嘗試刷新
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        log('Refresh failed', error);
        return false;
      }

      log('Session refreshed successfully');
      return true;
    } catch (err) {
      log('Refresh exception', err);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================
// 登出處理
// ============================================

async function handleAuthFailure(): Promise<void> {
  log('Auth failure - signing out');
  
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[safeCall] signOut error:', err);
  }

  // 導回登入頁
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// ============================================
// Safe RPC 呼叫
// ============================================

interface SafeRpcResult<T> {
  data: T | null;
  error: any;
}

export async function safeRpc<T = any>(
  functionName: string,
  args?: Record<string, any>
): Promise<SafeRpcResult<T>> {
  // 第一次嘗試
  const firstResult = await supabase.rpc(functionName, args);
  
  if (!firstResult.error) {
    return { data: firstResult.data, error: null };
  }

  // 檢查是否為 auth 錯誤
  if (isAuthError(firstResult.error)) {
    log(`RPC ${functionName} auth error, attempting refresh...`);
    
    const refreshed = await refreshSession();
    
    if (refreshed) {
      // 重試
      log(`Retrying RPC ${functionName}...`);
      const retryResult = await supabase.rpc(functionName, args);
      
      if (!retryResult.error) {
        return { data: retryResult.data, error: null };
      }

      // 重試仍失敗
      if (isAuthError(retryResult.error)) {
        await handleAuthFailure();
        return { data: null, error: retryResult.error };
      }

      return { data: null, error: retryResult.error };
    } else {
      // 刷新失敗
      await handleAuthFailure();
      return { data: null, error: firstResult.error };
    }
  }

  // 網路錯誤 - 重試一次
  if (isNetworkError(firstResult.error)) {
    log(`RPC ${functionName} network error, retrying...`);
    
    // 等待一下再重試
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const retryResult = await supabase.rpc(functionName, args);
    return { data: retryResult.data, error: retryResult.error };
  }

  // 其他錯誤直接回傳
  return { data: null, error: firstResult.error };
}

// ============================================
// Safe Query 呼叫（用於 from().select() 等）
// ============================================

type QueryFn<T> = () => Promise<{ data: T | null; error: any }>;

export async function safeQuery<T = any>(
  queryFn: QueryFn<T>,
  operationName: string = 'query'
): Promise<SafeRpcResult<T>> {
  // 第一次嘗試
  const firstResult = await queryFn();
  
  if (!firstResult.error) {
    return { data: firstResult.data, error: null };
  }

  // 檢查是否為 auth 錯誤
  if (isAuthError(firstResult.error)) {
    log(`Query ${operationName} auth error, attempting refresh...`);
    
    const refreshed = await refreshSession();
    
    if (refreshed) {
      // 重試
      log(`Retrying query ${operationName}...`);
      const retryResult = await queryFn();
      
      if (!retryResult.error) {
        return { data: retryResult.data, error: null };
      }

      // 重試仍失敗
      if (isAuthError(retryResult.error)) {
        await handleAuthFailure();
        return { data: null, error: retryResult.error };
      }

      return { data: null, error: retryResult.error };
    } else {
      // 刷新失敗
      await handleAuthFailure();
      return { data: null, error: firstResult.error };
    }
  }

  // 網路錯誤 - 重試一次
  if (isNetworkError(firstResult.error)) {
    log(`Query ${operationName} network error, retrying...`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const retryResult = await queryFn();
    return { data: retryResult.data, error: retryResult.error };
  }

  // 其他錯誤直接回傳
  return { data: null, error: firstResult.error };
}

// ============================================
// Safe From（封裝 supabase.from() 常用操作）
// ============================================

export const safeFrom = {
  select: async <T = any>(
    table: string,
    columns: string = '*',
    options?: {
      eq?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
      single?: boolean;
      maybeSingle?: boolean;
    }
  ): Promise<SafeRpcResult<T>> => {
    return safeQuery(async () => {
      let query = supabase.from(table).select(columns);

      if (options?.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options?.order) {
        query = query.order(options.order.column, { 
          ascending: options.order.ascending ?? false 
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.single) {
        return query.single();
      }

      if (options?.maybeSingle) {
        return query.maybeSingle();
      }

      return query;
    }, `select from ${table}`);
  },

  insert: async <T = any>(
    table: string,
    data: any,
    options?: { select?: boolean }
  ): Promise<SafeRpcResult<T>> => {
    return safeQuery(async () => {
      let query = supabase.from(table).insert(data);
      
      if (options?.select !== false) {
        query = query.select();
      }
      
      return query;
    }, `insert into ${table}`);
  },

  update: async <T = any>(
    table: string,
    data: any,
    match: Record<string, any>
  ): Promise<SafeRpcResult<T>> => {
    return safeQuery(async () => {
      let query = supabase.from(table).update(data);
      
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query.select();
    }, `update ${table}`);
  },

  delete: async (
    table: string,
    match: Record<string, any>
  ): Promise<SafeRpcResult<null>> => {
    return safeQuery(async () => {
      let query = supabase.from(table).delete();
      
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query;
    }, `delete from ${table}`);
  },
};

// ============================================
// 匯出
// ============================================

export { supabase };

