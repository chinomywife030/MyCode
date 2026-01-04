import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getToken } from '../tokenStore';

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
 * 發送 Expo Push Notification（支援多 token）
 */
async function sendExpoPushNotification(
  tokens: string[],
  data?: Record<string, any>
): Promise<any> {
  try {
    // 構建多 token 的 payload
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: 'BangBuy',
      body: 'Push works 🎉',
      data: data || {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendExpoPushNotification] HTTP error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const results = await response.json();
    return results;
  } catch (error: any) {
    console.error('[sendExpoPushNotification] Exception:', error);
    throw error;
  }
}

/**
 * GET /api/push/send-test
 * 健康檢查，確認 endpoint 存在
 */
export async function GET() {
  console.log('[push/send-test] GET');
  return NextResponse.json({
    ok: true,
    method: 'GET',
    hint: 'Use POST to actually send push',
  });
}

/**
 * POST /api/push/send-test
 * 發送測試推播
 * 
 * 支援 query 參數或 body：
 * - ?type=chat&conversationId=abc
 * - ?type=wish&wishId=w1
 * - ?toUserId=xxx (從 DB 查詢該 user 的所有 tokens)
 * - body: { type: "chat", conversationId: "abc", toUserId: "xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析 query 參數
    const { searchParams } = new URL(request.url);
    const typeFromQuery = searchParams.get('type');
    const conversationIdFromQuery = searchParams.get('conversationId');
    const wishIdFromQuery = searchParams.get('wishId');
    const toUserIdFromQuery = searchParams.get('toUserId');

    // 解析 body（如果有的話）
    let bodyData: any = {};
    try {
      const body = await request.json().catch(() => ({}));
      bodyData = body;
    } catch {
      // body 為空或無效，使用 query 參數
    }

    // 構建 data payload（優先使用 body，其次使用 query）
    const type = bodyData.type || typeFromQuery;
    const conversationId = bodyData.conversationId || conversationIdFromQuery;
    const wishId = bodyData.wishId || wishIdFromQuery;
    const toUserId = bodyData.toUserId || toUserIdFromQuery;

    let pushData: Record<string, any> = {};

    if (type === 'chat' && conversationId) {
      pushData = { type: 'chat', conversationId };
    } else if (type === 'wish' && wishId) {
      pushData = { type: 'wish', wishId };
    }

    // 決定要發送的 tokens
    let tokens: string[] = [];
    let tokenSource = 'memory';

    if (toUserId) {
      // 從 Supabase 查詢該 user 的所有 tokens
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: tokenRows, error } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', toUserId);

        if (error) {
          console.error('[push/send-test] DB query error:', error);
          return NextResponse.json(
            { ok: false, error: `查詢 tokens 失敗：${error.message}` },
            { status: 500 }
          );
        }

        if (!tokenRows || tokenRows.length === 0) {
          return NextResponse.json(
            { ok: false, error: `找不到 user ${toUserId} 的 push tokens` },
            { status: 404 }
          );
        }

        tokens = tokenRows.map((row) => row.token);
        tokenSource = 'supabase';
        console.log(`[push/send-test] Found ${tokens.length} tokens for user ${toUserId}`);
      } else {
        return NextResponse.json(
          { ok: false, error: 'Supabase 未配置，無法查詢 tokens' },
          { status: 500 }
        );
      }
    } else {
      // 使用記憶體暫存的 token（向後兼容）
      const memoryToken = getToken();
      if (!memoryToken) {
        return NextResponse.json(
          { ok: false, error: '沒有暫存的 token，請先呼叫 /api/push/register 或提供 toUserId' },
          { status: 404 }
        );
      }
      tokens = [memoryToken];
    }

    console.log('[push/send-test] POST sending to', tokens.length, 'tokens, source:', tokenSource, 'data:', pushData);

    // 呼叫 Expo Push API
    const expoResponse = await sendExpoPushNotification(tokens, pushData);

    // 印出 Expo API 的 response
    console.log('[push/send-test] POST Expo API response:', JSON.stringify(expoResponse, null, 2));

    return NextResponse.json({
      ok: true,
      sentTo: tokens.length,
      tokenSource,
      pushData,
      expoResponse,
    });
  } catch (error: any) {
    console.error('[push/send-test] POST Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '發送推播失敗' },
      { status: 500 }
    );
  }
}

