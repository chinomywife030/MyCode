/**
 * Wish 模組 - 使用 @bangbuy/core
 * 
 * 這個檔案現在是 @bangbuy/core/wish 的 re-export
 * 保留這個檔案是為了向後兼容，讓現有的 import 不用改變
 */

import { ensureCoreInitialized } from './core';
import {
  getWishes as coreGetWishes,
  getWishById as coreGetWishById,
  createWish as coreCreateWish,
  updateWishStatus as coreUpdateWishStatus,
  type Wish,
  type CreateWishParams,
  type CreateWishResult,
  type WishStatus,
} from '@bangbuy/core';

// 確保 core 已初始化
ensureCoreInitialized();

// Re-export types
export type { Wish, CreateWishParams, CreateWishResult, WishStatus };

/**
 * 從 Supabase 獲取所有 wishes（列表頁用）
 */
export async function getWishes(keyword?: string): Promise<Wish[]> {
  ensureCoreInitialized();
  return coreGetWishes({ keyword });
}

/**
 * 從 Supabase 根據 id 獲取單筆 wish（詳情頁用）
 */
export async function getWishById(id: string): Promise<Wish | undefined> {
  ensureCoreInitialized();
  return coreGetWishById(id);
}

/**
 * 創建一個新的 wish
 */
export async function createWish(
  title: string,
  description?: string,
  budget?: number,
  price?: number,
  commission?: number,
  productUrl?: string,
  targetCountry?: string,
  category?: string,
  deadline?: string
): Promise<CreateWishResult> {
  ensureCoreInitialized();
  return coreCreateWish({
    title,
    description,
    budget,
    price,
    commission,
    productUrl,
    targetCountry,
    category,
    deadline,
  });
}

/**
 * 更新需求狀態
 */
export async function updateWishStatus(
  wishId: string,
  status: WishStatus
): Promise<{ success: boolean; error?: string }> {
  ensureCoreInitialized();
  return coreUpdateWishStatus(wishId, status);
}
