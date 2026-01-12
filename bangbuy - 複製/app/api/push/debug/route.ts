import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Supabase Admin Client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey);
}

/**
 * 調試推送通知問題
 * 
 * GET /api/push/debug?userId=<userId>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // 支持 userId 和 userid（不区分大小写）
    const userId = searchParams.get('userId') || searchParams.get('userid');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase service role key 未配置' },
        { status: 500 }
      );
    }

    // 1. 查詢所有 device_tokens
    const { data: allTokens, error: allTokensError } = await supabase
      .from('device_tokens')
      .select('id, user_id, fcm_token, platform, device_id, last_seen_at, created_at')
      .order('last_seen_at', { ascending: false })
      .limit(50);

    if (allTokensError) {
      console.error('[GET /api/push/debug] Query error:', allTokensError);
      return NextResponse.json(
        { success: false, error: `查詢失敗：${allTokensError.message}` },
        { status: 500 }
      );
    }

    // 2. 如果指定了 userId，查詢該用戶的 tokens
    let userTokens = null;
    if (userId) {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('id, user_id, fcm_token, platform, device_id, last_seen_at, created_at')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

      if (error) {
        console.error('[GET /api/push/debug] User tokens query error:', error);
      } else {
        userTokens = data;
      }
    }

    // 3. 查詢最近的 wish_replies（用於檢查推送觸發）
    const { data: recentReplies, error: repliesError } = await supabase
      .from('wish_replies')
      .select('id, wish_id, user_id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. 查詢最近的 wishes（用於檢查 buyer_id）
    const { data: recentWishes, error: wishesError } = await supabase
      .from('wish_requests')
      .select('id, title, buyer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      summary: {
        totalTokens: allTokens?.length || 0,
        userTokensCount: userTokens?.length || 0,
        recentRepliesCount: recentReplies?.length || 0,
        recentWishesCount: recentWishes?.length || 0,
      },
      allTokens: allTokens?.map((t) => ({
        id: t.id,
        userId: t.user_id,
        tokenPreview: t.fcm_token ? `${t.fcm_token.substring(0, 20)}...` : null,
        platform: t.platform,
        deviceId: t.device_id,
        lastSeenAt: t.last_seen_at,
        createdAt: t.created_at,
      })),
      userTokens: userTokens?.map((t) => ({
        id: t.id,
        userId: t.user_id,
        tokenPreview: t.fcm_token ? `${t.fcm_token.substring(0, 20)}...` : null,
        platform: t.platform,
        deviceId: t.device_id,
        lastSeenAt: t.last_seen_at,
        createdAt: t.created_at,
      })),
      recentReplies: recentReplies?.map((r) => ({
        id: r.id,
        wishId: r.wish_id,
        userId: r.user_id,
        messagePreview: r.message ? `${r.message.substring(0, 30)}...` : null,
        createdAt: r.created_at,
      })),
      recentWishes: recentWishes?.map((w) => ({
        id: w.id,
        title: w.title,
        buyerId: w.buyer_id,
        createdAt: w.created_at,
      })),
      debug: {
        userId: userId || 'not specified',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[GET /api/push/debug] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || '調試失敗' },
      { status: 500 }
    );
  }
}

