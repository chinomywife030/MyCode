import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '../tokenStore';

export const runtime = 'nodejs';

/**
 * 發送 Expo Push Notification
 */
async function sendExpoPushNotification(
  token: string,
  data?: Record<string, any>
): Promise<any> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify([
        {
          to: token,
          sound: 'default',
          title: 'BangBuy',
          body: 'Push works 🎉',
          data: data || {},
        },
      ]),
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
 * - body: { type: "chat", conversationId: "abc" }
 */
export async function POST(request: NextRequest) {
  try {
    // 從暫存位置取得 token
    const token = getToken();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: '沒有暫存的 token，請先呼叫 /api/push/register' },
        { status: 404 }
      );
    }

    // 解析 query 參數
    const { searchParams } = new URL(request.url);
    const typeFromQuery = searchParams.get('type');
    const conversationIdFromQuery = searchParams.get('conversationId');
    const wishIdFromQuery = searchParams.get('wishId');

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

    let pushData: Record<string, any> = {};

    if (type === 'chat' && conversationId) {
      pushData = { type: 'chat', conversationId };
    } else if (type === 'wish' && wishId) {
      pushData = { type: 'wish', wishId };
    }

    console.log('[push/send-test] POST sending to token=', token.substring(0, 20) + '...', 'data=', pushData);

    // 呼叫 Expo Push API
    const expoResponse = await sendExpoPushNotification(token, pushData);

    // 印出 Expo API 的 response
    console.log('[push/send-test] POST Expo API response:', JSON.stringify(expoResponse, null, 2));

    return NextResponse.json({
      ok: true,
      expoResponse,
      pushData,
    });
  } catch (error: any) {
    console.error('[push/send-test] POST Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '發送推播失敗' },
      { status: 500 }
    );
  }
}

