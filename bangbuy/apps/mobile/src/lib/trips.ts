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
      console.error('[getMoments] Supabase error:', error);
      throw new Error(error.message || '獲取旅行時刻失敗');
    }

    // 轉換資料格式
    return (data || []).map((item: any) => ({
      id: item.id,
      trip_id: item.trip_id,
      user_id: item.user_id,
      description: item.description,
      images: item.images || [],
      location: item.location,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: item.profiles ? {
        id: item.profiles.id,
        name: item.profiles.name || '匿名用戶',
        avatar_url: item.profiles.avatar_url,
      } : undefined,
    }));
  } catch (error: any) {
    console.error('[getMoments] Exception:', error);
    throw error;
  }
}
