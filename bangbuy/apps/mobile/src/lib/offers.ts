import { supabase } from './supabase';

/**
 * 🏷️ Offers Service - App 端報價系統
 * 統一使用 offers 表作為單一真實來源（與 Web 一致）
 */

// ========== Types ==========

export interface Offer {
  id: string;
  wish_id: string;
  buyer_id: string;
  shopper_id: string;
  amount: number;
  currency: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  created_at: string;
  updated_at: string;
  // Joined fields
  shopper_name?: string;
  shopper_avatar?: string;
}

export interface CreateOfferParams {
  wishId: string;
  amount: number;
  message?: string;
}

export interface CreateOfferResult {
  success: boolean;
  offerId?: string;
  error?: string;
}

export interface GetOffersResult {
  success: boolean;
  offers: Offer[];
  isBuyer?: boolean;
  error?: string;
}

// ========== API Functions ==========

/**
 * 建立報價（使用 create_offer RPC，與 Web 一致）
 */
export async function createOffer(params: CreateOfferParams): Promise<CreateOfferResult> {
  const { wishId, amount, message } = params;

  console.log('[offers/createOffer] Starting with params:', { wishId, amount, hasMessage: !!message });

  try {
    const { data, error } = await supabase.rpc('create_offer', {
      p_wish_id: wishId,
      p_amount: amount,
      p_message: message || null,
    });

    console.log('[offers/createOffer] RPC response:', { data, error });

    if (error) {
      console.error('[offers/createOffer] RPC error:', error);
      return { success: false, error: error.message || '建立報價失敗' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || '建立報價失敗' };
    }

    console.log('[offers/createOffer] Success, offerId:', data.offer_id);
    return { success: true, offerId: data.offer_id };
  } catch (err: any) {
    console.error('[offers/createOffer] Exception:', err);
    return { success: false, error: err.message || '發生錯誤' };
  }
}

/**
 * 獲取某需求的報價列表（使用 get_offers_for_wish RPC，與 Web 一致）
 */
export async function getOffersForWish(wishId: string): Promise<GetOffersResult> {
  console.log('[offers/getOffersForWish] Starting for wishId:', wishId);

  try {
    const { data, error } = await supabase.rpc('get_offers_for_wish', {
      p_wish_id: wishId,
    });

    console.log('[offers/getOffersForWish] RPC response:', {
      hasData: !!data,
      success: data?.success,
      offersCount: data?.offers?.length || 0,
      isBuyer: data?.is_buyer,
      error: error || data?.error,
    });

    if (error) {
      console.error('[offers/getOffersForWish] RPC error:', error);
      return { success: false, offers: [], error: error.message || '獲取報價失敗' };
    }

    if (!data?.success) {
      return { success: false, offers: [], error: data?.error || '獲取報價失敗' };
    }

    // 轉換數據
    const offers: Offer[] = (data.offers || []).map((o: any) => ({
      id: o.id,
      wish_id: o.wish_id,
      buyer_id: o.buyer_id,
      shopper_id: o.shopper_id,
      amount: o.amount,
      currency: o.currency || 'TWD',
      message: o.message,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      shopper_name: o.shopper_name,
      shopper_avatar: o.shopper_avatar,
    }));

    // Debug: 輸出報價詳情
    if (offers.length > 0) {
      console.log('[offers/getOffersForWish] Offers fetched:', {
        count: offers.length,
        amounts: offers.map(o => o.amount),
        latestCreatedAt: offers[0]?.created_at,
        statuses: offers.map(o => o.status),
      });
    }

    return {
      success: true,
      offers,
      isBuyer: data.is_buyer,
    };
  } catch (err: any) {
    console.error('[offers/getOffersForWish] Exception:', err);
    return { success: false, offers: [], error: err.message || '發生錯誤' };
  }
}

/**
 * 獲取某需求的報價數量
 */
export async function getOfferCountForWish(wishId: string): Promise<number> {
  console.log('[offers/getOfferCountForWish] Starting for wishId:', wishId);

  try {
    // 使用 get_offers_for_wish RPC 獲取報價列表，然後計算數量
    // 這樣可以利用 RPC 的 SECURITY DEFINER 繞過 RLS 限制
    const result = await getOffersForWish(wishId);
    
    if (!result.success) {
      console.error('[offers/getOfferCountForWish] Failed to get offers:', result.error);
      return 0;
    }

    const count = result.offers.length;
    console.log('[offers/getOfferCountForWish] Count:', count);
    return count;
  } catch (err: any) {
    console.error('[offers/getOfferCountForWish] Exception:', err);
    return 0;
  }
}

/**
 * 獲取某需求的最新一筆報價
 */
export async function getLatestOfferForWish(wishId: string): Promise<Offer | undefined> {
  console.log('[offers/getLatestOfferForWish] Starting for wishId:', wishId);

  try {
    const result = await getOffersForWish(wishId);
    
    if (!result.success || result.offers.length === 0) {
      console.log('[offers/getLatestOfferForWish] No offers found');
      return undefined;
    }

    // offers 已經按 created_at DESC 排序，取第一筆
    const latestOffer = result.offers[0];
    console.log('[offers/getLatestOfferForWish] Latest offer:', {
      id: latestOffer.id,
      amount: latestOffer.amount,
      created_at: latestOffer.created_at,
      status: latestOffer.status,
    });

    return latestOffer;
  } catch (err: any) {
    console.error('[offers/getLatestOfferForWish] Exception:', err);
    return undefined;
  }
}

// ========== Helpers ==========

/**
 * 格式化金額
 */
export function formatAmount(amount: number, currency: string = 'TWD'): string {
  return `${currency === 'TWD' ? 'NT$' : currency} ${amount.toLocaleString()}`;
}

/**
 * 獲取報價狀態的顯示文字
 */
export function getOfferStatusText(status: Offer['status']): string {
  switch (status) {
    case 'pending':
      return '等待回覆';
    case 'accepted':
      return '已接受';
    case 'rejected':
      return '已拒絕';
    case 'withdrawn':
      return '已撤回';
    case 'expired':
      return '已過期';
    default:
      return '未知';
  }
}
