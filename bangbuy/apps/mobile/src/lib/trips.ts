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
 */
export async function getTrips(keyword?: string): Promise<Trip[]> {
  ensureCoreInitialized();
  return coreGetTrips({ keyword });
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
