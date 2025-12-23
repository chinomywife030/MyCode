import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用 Service Role Key 以繞過 RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, userId } = await request.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // TODO: 實際整合 PayPal API 驗證訂閱狀態
    // const paypalResponse = await verifyPayPalSubscription(subscriptionId);
    // if (paypalResponse.status !== 'ACTIVE') {
    //   return NextResponse.json(
    //     { error: '訂閱未啟用' },
    //     { status: 400 }
    //   );
    // }

    // 開發階段：直接標記為 Supporter
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_supporter: true,
        // 可選：記錄訂閱 ID
        // paypal_subscription_id: subscriptionId,
      })
      .eq('id', userId);

    if (error) {
      console.error('[Supporter] 更新失敗:', error);
      return NextResponse.json(
        { error: '更新 Supporter 狀態失敗' },
        { status: 500 }
      );
    }

    console.log('[Supporter] 訂閱成功:', { userId, subscriptionId });

    return NextResponse.json({
      success: true,
      message: 'Supporter 身分已啟用',
    });

  } catch (error: any) {
    console.error('[Supporter] 驗證錯誤:', error);
    return NextResponse.json(
      { error: error.message || '伺服器錯誤' },
      { status: 500 }
    );
  }
}

// TODO: PayPal 訂閱驗證函數（實際整合時使用）
// async function verifyPayPalSubscription(subscriptionId: string) {
//   const PAYPAL_API = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';
//   const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
//   const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
//
//   // 1. 獲取 Access Token
//   const authResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
//     method: 'POST',
//     headers: {
//       'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//     },
//     body: 'grant_type=client_credentials',
//   });
//
//   const { access_token } = await authResponse.json();
//
//   // 2. 驗證訂閱狀態
//   const subResponse = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
//     headers: {
//       'Authorization': `Bearer ${access_token}`,
//       'Content-Type': 'application/json',
//     },
//   });
//
//   return await subResponse.json();
// }






