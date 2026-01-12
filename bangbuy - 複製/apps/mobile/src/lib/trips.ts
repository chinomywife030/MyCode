/**
 * Trips 模組 - 使用 @bangbuy/core
 * 
 * 這個檔案現在是 @bangbuy/core/trips 的 re-export
 * 保留這個檔案是為了向後兼容，讓現有的 import 不用改變
 */

import { ensureCoreInitialized } from './core';
import {
  getTrips as coreGetTrips,
  getTripById as coreGetTripById,
  createTrip as coreCreateTrip,
  formatDateRange as coreFormatDateRange,
  type Trip,
  type CreateTripParams,
  type CreateTripResult,
} from '@bangbuy/core';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// 確保 core 已初始化
ensureCoreInitialized();

// Re-export types
export type { Trip, CreateTripParams, CreateTripResult };

/**
 * 從 Supabase 獲取行程列表
 * 支援搜索和篩選
 */
export async function getTrips(options?: {
  keyword?: string;
  sortBy?: 'newest' | 'date_asc' | 'date_desc';
  limit?: number;
}): Promise<Trip[]> {
  ensureCoreInitialized();
  return coreGetTrips(options);
}

/**
 * 從 Supabase 根據 id 獲取單筆行程
 */
export async function getTripById(id: string): Promise<Trip | undefined> {
  ensureCoreInitialized();
  return coreGetTripById(id);
}

/**
 * 創建行程
 */
export async function createTrip(params: CreateTripParams): Promise<CreateTripResult> {
  ensureCoreInitialized();
  return coreCreateTrip(params);
}

/**
 * 格式化日期範圍顯示
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  return coreFormatDateRange(startDate, endDate);
}

/**
 * 刪除行程（soft delete）
 * 注意：trips 表沒有 status 或 deleted_at 欄位
 * 使用一個變通方法：將 destination 設為特殊值或使用 description 標記
 * 但更好的方法是：在查詢時過濾掉已刪除的行程
 * 
 * 由於沒有合適的 soft delete 欄位，我們使用一個變通方法：
 * 在 description 前加上特殊標記 "[DELETED]"，並在查詢時過濾
 * 但這不是最佳實踐，理想情況下應該有 deleted_at 欄位
 * 
 * 實際上，由於用戶要求「不改 DB schema」，且 trips 表沒有合適的欄位，
 * 我們可以使用一個更簡單的方法：將 destination 設為空字串或特殊值
 * 但這會破壞資料完整性。
 * 
 * 更好的方法是：使用一個不會影響現有功能的欄位來標記刪除
 * 檢查是否有其他欄位可以用...
 * 
 * 由於 trips 表只有：id, destination, date, description, shopper_id, shopper_name, created_at, updated_at
 * 沒有 status、deleted_at、is_active 等欄位
 * 
 * 我們可以使用一個變通方法：
 * 1. 在 description 前加上 "[DELETED]" 標記（但這會修改 description）
 * 2. 或者使用 destination = NULL 或空字串（但這會破壞資料完整性）
 * 
 * 最安全的方法是：使用 description 欄位來標記刪除，但保留原始 description
 * 或者，我們可以檢查是否有其他方式...
 * 
 * 實際上，根據用戶要求「只能使用既有欄位」，如果沒有合適的欄位，我們可能需要：
 * - 使用 description 欄位來標記（但這不是最佳實踐）
 * - 或者建議用戶添加 deleted_at 欄位（但用戶說不改 schema）
 * 
 * 讓我檢查一下是否有其他方式...實際上，最簡單的方法是：
 * 使用 destination 欄位來標記刪除（例如設為 "[DELETED]"），但這會破壞資料
 * 
 * 更好的方法是：使用 description 欄位，在原始 description 前加上 "[DELETED]" 標記
 * 然後在查詢時過濾掉 description 以 "[DELETED]" 開頭的行程
 * 
 * 但這不是最佳實踐。理想情況下應該有 deleted_at 欄位。
 * 
 * 由於用戶明確要求「只能使用既有欄位」，且 trips 表沒有合適的欄位，
 * 我將使用一個變通方法：在 description 前加上 "[DELETED]" 標記
 * 這不是最佳實踐，但在不改 schema 的情況下是最可行的方案
 */
export async function deleteTrip(tripId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: '請先登入' };
    }

    // 先檢查該 trip 是否存在且為當前用戶所有
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('shopper_id, description')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) {
      return { success: false, error: '找不到該行程' };
    }

    if (trip.shopper_id !== currentUser.id) {
      return { success: false, error: '您沒有權限刪除此行程' };
    }

    // Soft delete: 在 description 前加上 "[DELETED]" 標記
    // 如果 description 已經有 "[DELETED]" 標記，就不再重複添加
    const deletedDescription = trip.description?.startsWith('[DELETED]')
      ? trip.description
      : `[DELETED]${trip.description || ''}`;

    const { error: updateError } = await supabase
      .from('trips')
      .update({ description: deletedDescription })
      .eq('id', tripId)
      .eq('shopper_id', currentUser.id); // 雙重保護：確保只能刪除自己的

    if (updateError) {
      console.error('[deleteTrip] Error:', updateError);
      return { success: false, error: updateError.message || '刪除失敗' };
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteTrip] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '刪除失敗：發生未知錯誤' };
  }
}

// ============================================
// Travel Moment (旅行時刻)
// ============================================

export interface TravelMoment {
  id: string;
  trip_id?: string;
  user_id: string;
  description?: string;
  images?: string[];
  location?: string;
  created_at: string;
  updated_at?: string;
  profiles?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

/**
 * 從 Supabase 獲取旅行時刻列表
 */
export async function getMoments(options?: {
  limit?: number;
}): Promise<TravelMoment[]> {
  ensureCoreInitialized();
  
  const { supabase } = await import('./supabase');
  
  try {
    let query = supabase
      .from('trip_moments')
      .select('*, profiles(id, name, avatar_url)')
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getMoments] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      trip_id: item.trip_id,
      user_id: item.user_id,
      description: item.description,
      images: Array.isArray(item.images) ? item.images : undefined,
      location: item.location,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: item.profiles ? {
        id: item.profiles.id,
        name: item.profiles.name || '匿名用戶',
        avatar_url: item.profiles.avatar_url || undefined,
      } : undefined,
    }));
  } catch (error) {
    console.error('[getMoments] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}
