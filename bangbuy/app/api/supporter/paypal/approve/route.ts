import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 環境變數
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com';
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID || 'P-02S95485WR471912RNFEVHJY';

// 使用 Service Role Key 以繞過 RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 從 cookie 提取並驗證 session
async function getSessionUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    const cookies = request.cookies;
    
    // Supabase auth token 通常存在這些 cookie 中
    const accessToken = cookies.get('sb-iaizclcplchjhbfafkiy-auth-token')?.value ||
                        cookies.get('supabase-auth-token')?.value;
    
    if (!accessToken) {
      // 嘗試從 Authorization header 取得
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return null;
        return { id: user.id, email: user.email };
      }
      return null;
    }
    
    // 解析 JSON token（Supabase 存的是 JSON 格式）
    let token: string;
    try {
      const parsed = JSON.parse(accessToken);
      token = parsed.access_token || parsed[0]?.access_token || accessToken;
    } catch {
      token = accessToken;
    }
    
    // 用 admin client 驗證 token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) return null;
    
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * 獲取 PayPal Access Token
 */
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Token error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * 獲取 PayPal 訂閱詳情
 */
async function getPayPalSubscription(subscriptionId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Subscription fetch error:', error);
    throw new Error('Failed to fetch PayPal subscription');
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  try {
    // 1. 驗證用戶已登入
    const user = await getSessionUser(request);

    if (!user) {
      console.error('[Supporter] Auth error: No valid session');
      return NextResponse.json(
        { error: '請先登入', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. 解析請求
    const body = await request.json();
    const { subscriptionID } = body;

    if (!subscriptionID) {
      return NextResponse.json(
        { error: '缺少 subscriptionID', code: 'MISSING_SUBSCRIPTION_ID' },
        { status: 400 }
      );
    }

    console.log('[Supporter] Processing subscription:', { userId: user.id, subscriptionID });

    // 3. 獲取 PayPal Access Token
    const accessToken = await getPayPalAccessToken();

    // 4. 查詢 PayPal 訂閱詳情
    const subscription = await getPayPalSubscription(subscriptionID, accessToken);
    
    console.log('[Supporter] PayPal subscription:', {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
    });

    // 5. 驗證 plan_id
    if (subscription.plan_id !== PAYPAL_PLAN_ID) {
      console.error('[Supporter] Plan ID mismatch:', {
        expected: PAYPAL_PLAN_ID,
        received: subscription.plan_id,
      });
      return NextResponse.json(
        { error: '訂閱方案不符', code: 'PLAN_MISMATCH' },
        { status: 400 }
      );
    }

    // 6. 檢查訂閱狀態
    const isActive = subscription.status === 'ACTIVE';

    // 7. 防盜綁：檢查是否已被其他用戶綁定
    const { data: existingBinding, error: bindingError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('paypal_subscription_id', subscriptionID)
      .neq('id', user.id)
      .maybeSingle();

    if (bindingError) {
      console.error('[Supporter] Binding check error:', bindingError);
    }

    if (existingBinding) {
      console.error('[Supporter] Subscription already bound to another user:', existingBinding.id);
      return NextResponse.json(
        { error: '此訂閱已綁定其他帳號', code: 'ALREADY_BOUND' },
        { status: 409 }
      );
    }

    // 8. 更新 profiles
    const updateData: Record<string, any> = {
      paypal_subscription_id: subscriptionID,
      paypal_plan_id: subscription.plan_id,
      paypal_status: subscription.status,
      supporter_updated_at: new Date().toISOString(),
    };

    if (isActive) {
      updateData.is_supporter = true;
      updateData.supporter_since = new Date().toISOString();
    } else {
      updateData.is_supporter = false;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('[Supporter] Update error:', updateError);
      return NextResponse.json(
        { error: '更新 Supporter 狀態失敗', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    console.log('[Supporter] Successfully processed:', {
      userId: user.id,
      subscriptionID,
      status: subscription.status,
      isSupporter: isActive,
    });

    // 9. 回傳結果
    if (isActive) {
      return NextResponse.json({
        success: true,
        message: 'Supporter 身分已啟用',
        status: 'ACTIVE',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `訂閱狀態為 ${subscription.status}，請稍後再試`,
        status: subscription.status,
      }, { status: 202 });
    }

  } catch (error: any) {
    console.error('[Supporter] Error:', error);
    return NextResponse.json(
      { error: error.message || '伺服器錯誤', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

