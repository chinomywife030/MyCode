import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/wishes/[id]/complete
 * 完成交易 - 只有發布者可以在 in_progress 狀態時呼叫
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Next.js 16: params 可能是 Promise，需要 await
    const resolvedParams = await Promise.resolve(params);
    let wishId = resolvedParams?.id;

    // 如果 params.id 不存在，嘗試從 URL 中提取
    if (!wishId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const completeIndex = pathParts.indexOf('complete');
      if (completeIndex > 0) {
        wishId = pathParts[completeIndex - 1];
      }
    }

    if (!wishId) {
      console.error('[Complete Transaction] Missing wish ID. URL:', request.url, 'Params:', resolvedParams);
      return NextResponse.json(
        { success: false, error: 'Missing wish ID' },
        { status: 400 }
      );
    }

    // 從 Authorization header 取得 token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // 使用 service role 來執行 RPC
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 呼叫 RPC 完成交易（如果 RPC 存在）
    // 先嘗試直接更新（fallback 方案）
    
    // 1. 獲取 wish 資料
    const { data: wish, error: wishError } = await supabase
      .from('wish_requests')
      .select('*')
      .eq('id', wishId)
      .single();

    if (wishError || !wish) {
      return NextResponse.json(
        { success: false, error: 'Wish not found' },
        { status: 404 }
      );
    }

    // 2. 驗證權限：只有發布者可以完成
    if (wish.buyer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized - only wish owner can complete' },
        { status: 403 }
      );
    }

    // 3. 驗證狀態：只有 in_progress 可以完成
    if (wish.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: 'Only in-progress wishes can be completed' },
        { status: 400 }
      );
    }

    // 4. 找出接受的報價以取得代購者 ID
    const { data: acceptedOffer } = await supabase
      .from('offers')
      .select('shopper_id')
      .eq('wish_id', wishId)
      .eq('status', 'accepted')
      .single();

    const shopperId = acceptedOffer?.shopper_id || wish.accepted_shopper_id;

    // 5. 更新 wish 狀態為 completed
    const { error: updateError } = await supabase
      .from('wish_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wishId);

    if (updateError) {
      console.error('[Complete Transaction] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to complete transaction' },
        { status: 500 }
      );
    }

    // 6. 將其他 pending offers 設為 expired
    await supabase
      .from('offers')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('wish_id', wishId)
      .eq('status', 'pending');

    // 7. 發送通知給代購者（如果有）
    if (shopperId) {
      // 獲取買家名稱
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const buyerName = buyerProfile?.name || '買家';

      await supabase.from('notifications').insert({
        user_id: shopperId,
        type: 'transaction_completed',
        title: '🎉 交易已完成',
        content: `${buyerName} 已確認完成交易：${wish.title}`,
        link: '/dashboard/orders',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      wish_id: wishId,
      shopper_id: shopperId,
    });

  } catch (error: any) {
    console.error('[Complete Transaction] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

