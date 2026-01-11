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
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// 確保 core 已初始化
ensureCoreInitialized();

// Re-export types
export type { Wish, CreateWishParams, CreateWishResult, WishStatus };

/**
 * 從 Supabase 獲取所有 wishes（列表頁用）
 * 支援搜索和篩選
 */
export async function getWishes(options?: {
  keyword?: string;
  country?: string;
  category?: string;
  status?: WishStatus;
  sortBy?: 'newest' | 'price_low' | 'price_high';
  minPrice?: number;
  maxPrice?: number;
  isUrgent?: boolean;
  limit?: number;
}): Promise<Wish[]> {
  ensureCoreInitialized();
  return coreGetWishes(options);
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

/**
 * 刪除需求（soft delete）
 * 使用 status = 'cancelled' 標記為已刪除
 */
export async function deleteWish(wishId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: '請先登入' };
    }

    // 先檢查該 wish 是否存在且為當前用戶所有
    const { data: wish, error: fetchError } = await supabase
      .from('wish_requests')
      .select('buyer_id, status')
      .eq('id', wishId)
      .single();

    if (fetchError || !wish) {
      return { success: false, error: '找不到該需求' };
    }

    if (wish.buyer_id !== currentUser.id) {
      return { success: false, error: '您沒有權限刪除此需求' };
    }

    // Soft delete: 將 status 設為 'cancelled'
    const { error: updateError } = await supabase
      .from('wish_requests')
      .update({ status: 'cancelled' })
      .eq('id', wishId)
      .eq('buyer_id', currentUser.id); // 雙重保護：確保只能刪除自己的

    if (updateError) {
      console.error('[deleteWish] Error:', updateError);
      return { success: false, error: updateError.message || '刪除失敗' };
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteWish] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : '刪除失敗：發生未知錯誤' };
  }
}
