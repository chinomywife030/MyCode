/**
 * 🛡️ 安全的 Supabase 資料存取層
 * 
 * 目的：
 * 1. 統一所有資料查詢的錯誤處理
 * 2. 確保查詢失敗不會中斷 UI
 * 3. 自動記錄錯誤事件
 * 4. 提供一致的回傳格式
 */

import { supabase } from '@/lib/supabase';
import { logError, ErrorContext } from '@/lib/errorLogger';

// 統一的回傳格式
export interface SafeResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * 安全的查詢執行器
 * @param operation - 要執行的操作描述（用於錯誤記錄）
 * @param queryFn - Supabase 查詢函數
 * @param context - 錯誤上下文（頁面、組件等）
 */
async function safeQuery<T>(
  operation: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: ErrorContext
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      // 記錄錯誤但不中斷流程
      logError(error, {
        ...context,
        operation,
        severity: 'warning',
      });

      return {
        success: false,
        data: null,
        error: error.message || '資料查詢失敗',
      };
    }

    return {
      success: true,
      data: data || null,
      error: null,
    };
  } catch (err: any) {
    // 捕捉意外錯誤
    logError(err, {
      ...context,
      operation,
      severity: 'error',
    });

    return {
      success: false,
      data: null,
      error: err?.message || '發生未預期的錯誤',
    };
  }
}

/**
 * 安全的插入操作
 */
async function safeInsert<T>(
  table: string,
  data: any,
  context?: ErrorContext
): Promise<SafeResult<T>> {
  return safeQuery(
    `Insert into ${table}`,
    () => supabase.from(table).insert(data).select().single(),
    context
  );
}

/**
 * 安全的更新操作
 */
async function safeUpdate<T>(
  table: string,
  data: any,
  match: Record<string, any>,
  context?: ErrorContext
): Promise<SafeResult<T>> {
  return safeQuery(
    `Update ${table}`,
    async () => {
      let query = supabase.from(table).update(data);
      
      // 應用所有匹配條件
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query.select().single();
    },
    context
  );
}

/**
 * 安全的刪除操作
 */
async function safeDelete(
  table: string,
  match: Record<string, any>,
  context?: ErrorContext
): Promise<SafeResult<null>> {
  return safeQuery(
    `Delete from ${table}`,
    async () => {
      let query = supabase.from(table).delete();
      
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query;
    },
    context
  );
}

/**
 * 安全的單筆查詢（使用 maybeSingle 避免找不到時報錯）
 */
async function safeFetchOne<T>(
  table: string,
  match: Record<string, any>,
  select: string = '*',
  context?: ErrorContext
): Promise<SafeResult<T>> {
  return safeQuery(
    `Fetch one from ${table}`,
    async () => {
      let query = supabase.from(table).select(select);
      
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return query.maybeSingle();
    },
    context
  );
}

/**
 * 安全的列表查詢
 */
async function safeFetchMany<T>(
  table: string,
  options?: {
    match?: Record<string, any>;
    select?: string;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  },
  context?: ErrorContext
): Promise<SafeResult<T[]>> {
  return safeQuery(
    `Fetch many from ${table}`,
    async () => {
      let query = supabase.from(table).select(options?.select || '*');
      
      // 應用過濾條件
      if (options?.match) {
        Object.entries(options.match).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      // 應用排序
      if (options?.order) {
        query = query.order(options.order.column, { 
          ascending: options.order.ascending ?? false 
        });
      }
      
      // 應用限制
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      return { data: data || [], error };
    },
    context
  );
}

// 匯出所有安全操作
export const safeSupabase = {
  query: safeQuery,
  insert: safeInsert,
  update: safeUpdate,
  delete: safeDelete,
  fetchOne: safeFetchOne,
  fetchMany: safeFetchMany,
  
  // 直接訪問原始 supabase（用於特殊情況，如 auth）
  raw: supabase,
};











