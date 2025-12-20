'use client';

/**
 * 🏷️ Offers Service - 報價系統核心服務
 * 整合 Email 通知（保底通知）
 */

import { safeRpc } from '@/lib/safeCall';

// ========== Email 通知 Helper ==========

/**
 * 發送 Email 通知（非阻斷式）
 * 返回發送狀態，但即使失敗也不會影響主流程
 */
async function sendEmailNotification(
  type: 'offer_created' | 'offer_accepted' | 'offer_rejected',
  offerId: string,
  conversationId?: string
): Promise<{ emailSent: boolean; emailError?: string }> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/offers.ts:sendEmailNotification',message:'Email notification started',data:{type,offerId,conversationId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  try {
    // 使用 fetch 呼叫 API Route（Server-Side 發送）
    const response = await fetch('/api/email/send-offer-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        offerId,
        conversationId,
      }),
    });

    const result = await response.json();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/offers.ts:sendEmailNotification',message:'API response received',data:{type,offerId,result,responseStatus:response.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    if (result.success) {
      if (result.skipped) {
        console.log(`[Email] Skipped: ${result.reason}`);
        return { emailSent: false, emailError: result.reason };
      } else {
        console.log(`[Email] Sent ${type} notification`);
        return { emailSent: true };
      }
    } else {
      console.warn(`[Email] Failed to send ${type}:`, result.error);
      return { emailSent: false, emailError: result.error };
    }
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/offers.ts:sendEmailNotification',message:'Email notification error',data:{type,offerId,error:error.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    // Email 失敗不應阻斷主流程
    console.warn(`[Email] Error sending ${type}:`, error);
    return { emailSent: false, emailError: error.message || 'Unknown error' };
  }
}

// ========== Types ==========

export interface Offer {
  id: string;
  wish_id: string;
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
  wish_title?: string;
  wish_budget?: number;
  target_country?: string;
  buyer_name?: string;
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
  emailSent?: boolean;
  emailError?: string;
}

export interface RespondToOfferResult {
  success: boolean;
  action?: 'accept' | 'reject';
  conversationId?: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
}

export interface GetOffersResult {
  success: boolean;
  offers: Offer[];
  isBuyer?: boolean;
  error?: string;
}

// ========== API Functions ==========

/**
 * 建立報價
 * 成功後會自動發送 Email 通知給買家（保底通知）
 * 返回 emailSent 狀態供 UI 顯示提示
 */
export async function createOffer(params: CreateOfferParams): Promise<CreateOfferResult> {
  const { wishId, amount, message } = params;

  try {
    const { data, error } = await safeRpc<{
      success: boolean;
      offer_id?: string;
      error?: string;
    }>('create_offer', {
      p_wish_id: wishId,
      p_amount: amount,
      p_message: message || null,
    });

    if (error) {
      console.error('[createOffer] RPC error:', error);
      return { success: false, error: error.message || '建立報價失敗' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || '建立報價失敗' };
    }

    // 📧 發送 Email 通知給買家（非阻斷式，返回結果）
    let emailSent = false;
    let emailError: string | undefined;
    
    if (data.offer_id) {
      const emailResult = await sendEmailNotification('offer_created', data.offer_id);
      emailSent = emailResult.emailSent;
      emailError = emailResult.emailError;
    }

    return { success: true, offerId: data.offer_id, emailSent, emailError };
  } catch (err: any) {
    console.error('[createOffer] Exception:', err);
    return { success: false, error: err.message || '發生錯誤' };
  }
}

/**
 * 回應報價（接受/拒絕）- 買家用
 * 成功後會自動發送 Email 通知給代購（保底通知）
 * 返回 emailSent 狀態供 UI 顯示提示
 */
export async function respondToOffer(
  offerId: string,
  action: 'accept' | 'reject'
): Promise<RespondToOfferResult> {
  try {
    const { data, error } = await safeRpc<{
      success: boolean;
      action?: string;
      conversation_id?: string;
      error?: string;
    }>('respond_to_offer', {
      p_offer_id: offerId,
      p_action: action,
    });

    if (error) {
      console.error('[respondToOffer] RPC error:', error);
      return { success: false, error: error.message || '操作失敗' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || '操作失敗' };
    }

    // 📧 發送 Email 通知給代購（非阻斷式，返回結果）
    const emailType = action === 'accept' ? 'offer_accepted' : 'offer_rejected';
    const emailResult = await sendEmailNotification(emailType, offerId, data.conversation_id);

    return {
      success: true,
      action: data.action as 'accept' | 'reject',
      conversationId: data.conversation_id,
      emailSent: emailResult.emailSent,
      emailError: emailResult.emailError,
    };
  } catch (err: any) {
    console.error('[respondToOffer] Exception:', err);
    return { success: false, error: err.message || '發生錯誤' };
  }
}

/**
 * 撤回報價 - 代購者用
 */
export async function withdrawOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await safeRpc<{
      success: boolean;
      error?: string;
    }>('withdraw_offer', {
      p_offer_id: offerId,
    });

    if (error) {
      console.error('[withdrawOffer] RPC error:', error);
      return { success: false, error: error.message || '撤回失敗' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || '撤回失敗' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[withdrawOffer] Exception:', err);
    return { success: false, error: err.message || '發生錯誤' };
  }
}

/**
 * 獲取某需求的報價列表
 */
export async function getOffersForWish(wishId: string): Promise<GetOffersResult> {
  try {
    const { data, error } = await safeRpc<{
      success: boolean;
      offers?: any[];
      is_buyer?: boolean;
      error?: string;
    }>('get_offers_for_wish', {
      p_wish_id: wishId,
    });

    if (error) {
      console.error('[getOffersForWish] RPC error:', error);
      return { success: false, offers: [], error: error.message || '獲取報價失敗' };
    }

    if (!data?.success) {
      return { success: false, offers: [], error: data?.error || '獲取報價失敗' };
    }

    // 轉換 snake_case 到 camelCase
    const offers: Offer[] = (data.offers || []).map((o: any) => ({
      id: o.id,
      wish_id: o.wish_id,
      shopper_id: o.shopper_id,
      amount: o.amount,
      currency: o.currency,
      message: o.message,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      shopper_name: o.shopper_name,
      shopper_avatar: o.shopper_avatar,
    }));

    return {
      success: true,
      offers,
      isBuyer: data.is_buyer,
    };
  } catch (err: any) {
    console.error('[getOffersForWish] Exception:', err);
    return { success: false, offers: [], error: err.message || '發生錯誤' };
  }
}

/**
 * 獲取我的報價（代購者用）
 */
export async function getMyOffers(status?: string): Promise<GetOffersResult> {
  try {
    const { data, error } = await safeRpc<{
      success: boolean;
      offers?: any[];
      error?: string;
    }>('get_my_offers', {
      p_status: status || null,
    });

    if (error) {
      console.error('[getMyOffers] RPC error:', error);
      return { success: false, offers: [], error: error.message || '獲取報價失敗' };
    }

    if (!data?.success) {
      return { success: false, offers: [], error: data?.error || '獲取報價失敗' };
    }

    const offers: Offer[] = (data.offers || []).map((o: any) => ({
      id: o.id,
      wish_id: o.wish_id,
      shopper_id: o.shopper_id,
      amount: o.amount,
      currency: o.currency,
      message: o.message,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      wish_title: o.wish_title,
      wish_budget: o.wish_budget,
      target_country: o.target_country,
      buyer_name: o.buyer_name,
    }));

    return { success: true, offers };
  } catch (err: any) {
    console.error('[getMyOffers] Exception:', err);
    return { success: false, offers: [], error: err.message || '發生錯誤' };
  }
}

// ========== Helpers ==========

/**
 * 獲取報價狀態的顯示文字和顏色
 */
export function getOfferStatusDisplay(status: Offer['status']): {
  text: string;
  className: string;
} {
  switch (status) {
    case 'pending':
      return { text: '等待回覆', className: 'bg-yellow-100 text-yellow-700' };
    case 'accepted':
      return { text: '已接受', className: 'bg-green-100 text-green-700' };
    case 'rejected':
      return { text: '已拒絕', className: 'bg-red-100 text-red-700' };
    case 'withdrawn':
      return { text: '已撤回', className: 'bg-gray-100 text-gray-600' };
    case 'expired':
      return { text: '已過期', className: 'bg-gray-100 text-gray-500' };
    default:
      return { text: '未知', className: 'bg-gray-100 text-gray-500' };
  }
}

/**
 * 格式化金額
 */
export function formatAmount(amount: number, currency: string = 'TWD'): string {
  return `${currency === 'TWD' ? 'NT$' : currency} ${amount.toLocaleString()}`;
}

