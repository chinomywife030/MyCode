/**
 * 📧 API Route: 發送報價相關 Email 通知
 * POST /api/email/send-offer-notification
 * 
 * 這個 API 由前端在報價操作成功後呼叫
 * 使用 Server-Side 發送 Email，前端不直接接觸 Email Provider
 * 
 * 回傳格式:
 * { success: true, messageId?: string, emailSent: boolean }
 * { success: true, skipped: true, reason: string }
 * { success: false, error: string, emailSent: false }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendOfferCreatedEmail,
  sendOfferAcceptedEmail,
  sendOfferRejectedEmail,
} from '@/lib/email';

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 從 profiles 或 auth.users 獲取用戶 email
async function getUserEmail(supabase: any, userId: string): Promise<string | null> {
  // 1. 先嘗試從 profiles 獲取
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  
  if (profile?.email) {
    return profile.email;
  }
  
  // 2. 如果 profiles 沒有 email，從 auth.users 獲取（需要 service role）
  try {
    const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      console.log(`[Email API] Got email from auth.users for user ${userId}`);
      
      // 同步到 profiles 表
      await supabase
        .from('profiles')
        .update({ email: authUser.user.email })
        .eq('id', userId);
      
      return authUser.user.email;
    }
    if (error) {
      console.warn(`[Email API] Failed to get email from auth.users: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[Email API] Error getting email from auth.users: ${err.message}`);
  }
  
  return null;
}

// 診斷輸出 helper
function logDiagnostics(type: string, offerId: string) {
  console.log('═'.repeat(60));
  console.log(`📧 [send-offer-notification] 報價郵件通知`);
  console.log('─'.repeat(60));
  console.log(`  類型:     ${type}`);
  console.log(`  報價ID:   ${offerId}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  時間:     ${new Date().toISOString()}`);
  console.log('═'.repeat(60));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, offerId, wishId, amount, message, conversationId } = body;

    if (!type || !offerId) {
      console.error('❌ [send-offer-notification] 缺少必要參數:', { type, offerId });
      return NextResponse.json(
        { success: false, error: 'Missing required fields', emailSent: false },
        { status: 400 }
      );
    }

    // 診斷輸出
    logDiagnostics(type, offerId);

    const supabase = getSupabaseAdmin();

    // 獲取報價詳細資料（使用 maybeSingle 避免 406 錯誤）
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        id,
        wish_id,
        buyer_id,
        shopper_id,
        amount,
        currency,
        message,
        status
      `)
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) {
      console.error('[Email API] Error fetching offer:', offerError);
      return NextResponse.json(
        { success: false, error: `Database error: ${offerError.message}`, emailSent: false },
        { status: 500 }
      );
    }
    
    if (!offer) {
      console.error('[Email API] Offer not found:', offerId);
      return NextResponse.json(
        { success: false, error: 'Offer not found', emailSent: false },
        { status: 404 }
      );
    }

    // 獲取買家資料（使用 maybeSingle）
    const { data: buyerProfile, error: buyerError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', offer.buyer_id)
      .maybeSingle();
    
    if (buyerError) {
      console.warn('[Email API] Error fetching buyer profile:', buyerError);
    }
    
    // 獲取買家 email（從 profiles 或 auth.users）
    const buyerEmail = await getUserEmail(supabase, offer.buyer_id);

    // 獲取代購資料（使用 maybeSingle）
    const { data: shopperProfile, error: shopperError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', offer.shopper_id)
      .maybeSingle();
    
    if (shopperError) {
      console.warn('[Email API] Error fetching shopper profile:', shopperError);
    }
    
    // 獲取代購 email（從 profiles 或 auth.users）
    const shopperEmail = await getUserEmail(supabase, offer.shopper_id);

    // 獲取需求資料（使用 maybeSingle）
    const { data: wish, error: wishError } = await supabase
      .from('wish_requests')
      .select('id, title')
      .eq('id', offer.wish_id)
      .maybeSingle();
    
    if (wishError) {
      console.warn('[Email API] Error fetching wish:', wishError);
    }
    
    // Log 資料取得結果
    console.log(`  買家: ${buyerProfile?.name || '(unknown)'} <${buyerEmail || 'no email'}>`);
    console.log(`  代購: ${shopperProfile?.name || '(unknown)'} <${shopperEmail || 'no email'}>`);
    console.log(`  需求: ${wish?.title || '(unknown)'}`);
    console.log(`  金額: ${offer.amount} ${offer.currency || 'TWD'}`);

    // 檢查用戶 Email 設定
    async function checkEmailPreference(userId: string, category: string): Promise<boolean> {
      const { data } = await supabase.rpc('check_email_preference', {
        p_user_id: userId,
        p_category: category,
      });
      return data !== false;
    }

    let result;

    switch (type) {
      case 'offer_created': {
        // 檢查買家是否允許報價通知
        const canSend = await checkEmailPreference(offer.buyer_id, 'offer_created');
        if (!canSend) {
          console.log('[Email API] Skipped: User disabled offer notifications');
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled offer notifications', emailSent: false });
        }

        if (!buyerEmail) {
          console.log('[Email API] Skipped: Buyer has no email');
          return NextResponse.json({ success: true, skipped: true, reason: 'Buyer has no email', emailSent: false });
        }

        console.log(`[Email API] Sending offer_created email to: ${buyerEmail}`);
        result = await sendOfferCreatedEmail({
          buyerEmail: buyerEmail,
          buyerId: offer.buyer_id,
          offerId: offer.id,
          buyerName: buyerProfile?.name || '',
          shopperName: shopperProfile?.name || '',
          wishTitle: wish?.title || '需求',
          wishId: offer.wish_id,
          amount: offer.amount,
          currency: offer.currency,
          message: offer.message,
        });
        break;
      }

      case 'offer_accepted': {
        // 檢查代購是否允許接受/拒絕通知
        const canSend = await checkEmailPreference(offer.shopper_id, 'offer_accepted');
        if (!canSend) {
          console.log('[Email API] Skipped: User disabled accept/reject notifications');
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled accept/reject notifications', emailSent: false });
        }

        if (!shopperEmail) {
          console.log('[Email API] Skipped: Shopper has no email');
          return NextResponse.json({ success: true, skipped: true, reason: 'Shopper has no email', emailSent: false });
        }

        console.log(`[Email API] Sending offer_accepted email to: ${shopperEmail}`);
        result = await sendOfferAcceptedEmail({
          shopperEmail: shopperEmail,
          shopperId: offer.shopper_id,
          offerId: offer.id,
          shopperName: shopperProfile?.name || '',
          buyerName: buyerProfile?.name || '',
          wishTitle: wish?.title || '需求',
          wishId: offer.wish_id,
          amount: offer.amount,
          currency: offer.currency,
          conversationId,
        });
        break;
      }

      case 'offer_rejected': {
        // 檢查代購是否允許接受/拒絕通知
        const canSend = await checkEmailPreference(offer.shopper_id, 'offer_rejected');
        if (!canSend) {
          console.log('[Email API] Skipped: User disabled accept/reject notifications');
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled accept/reject notifications', emailSent: false });
        }

        if (!shopperEmail) {
          console.log('[Email API] Skipped: Shopper has no email');
          return NextResponse.json({ success: true, skipped: true, reason: 'Shopper has no email', emailSent: false });
        }

        console.log(`[Email API] Sending offer_rejected email to: ${shopperEmail}`);
        result = await sendOfferRejectedEmail({
          shopperEmail: shopperEmail,
          shopperId: offer.shopper_id,
          offerId: offer.id,
          shopperName: shopperProfile?.name || '',
          buyerName: buyerProfile?.name || '',
          wishTitle: wish?.title || '需求',
          wishId: offer.wish_id,
          amount: offer.amount,
          currency: offer.currency,
        });
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

    // 添加 emailSent 標記
    const responseData = {
      ...result,
      emailSent: result.success && !result.skipped,
    };

    if (result.success && !result.skipped) {
      console.log(`✅ [send-offer-notification] 郵件發送成功: ${result.messageId || 'N/A'}`);
    } else if (result.skipped) {
      console.log(`⏭️ [send-offer-notification] 郵件跳過: ${result.reason}`);
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('═'.repeat(60));
    console.error('❌ [send-offer-notification] 發送失敗');
    console.error('─'.repeat(60));
    console.error('  錯誤類型:', error.name || 'Unknown');
    console.error('  錯誤訊息:', error.message || 'No message');
    console.error('  完整錯誤:', JSON.stringify(error, null, 2));
    console.error('═'.repeat(60));
    
    // 即使發送失敗也返回 200，不阻斷主流程
    return NextResponse.json({
      success: false,
      error: error.message || 'Email send failed',
      emailSent: false,
    });
  }
}


