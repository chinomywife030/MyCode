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

    // 獲取報價詳細資料
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
      .single();

    if (offerError || !offer) {
      console.error('[Email API] Offer not found:', offerError);
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    // 獲取買家資料
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', offer.buyer_id)
      .single();

    // 獲取代購資料
    const { data: shopperProfile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', offer.shopper_id)
      .single();

    // 獲取需求資料
    const { data: wish } = await supabase
      .from('wish_requests')
      .select('id, title')
      .eq('id', offer.wish_id)
      .single();

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
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled offer notifications' });
        }

        if (!buyerProfile?.email) {
          return NextResponse.json({ success: true, skipped: true, reason: 'Buyer has no email' });
        }

        result = await sendOfferCreatedEmail({
          buyerEmail: buyerProfile.email,
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
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled accept/reject notifications' });
        }

        if (!shopperProfile?.email) {
          return NextResponse.json({ success: true, skipped: true, reason: 'Shopper has no email' });
        }

        result = await sendOfferAcceptedEmail({
          shopperEmail: shopperProfile.email,
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
          return NextResponse.json({ success: true, skipped: true, reason: 'User disabled accept/reject notifications' });
        }

        if (!shopperProfile?.email) {
          return NextResponse.json({ success: true, skipped: true, reason: 'Shopper has no email' });
        }

        result = await sendOfferRejectedEmail({
          shopperEmail: shopperProfile.email,
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


