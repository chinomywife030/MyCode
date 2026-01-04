import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '../tokenStore';

export const runtime = 'nodejs';

/**
 * 發送 Expo Push Notification
 */
async function sendExpoPushNotification(token: string): Promise<any> {
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
 * POST /api/push/send-test
 * 發送測試推播
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

    console.log('[POST /api/push/send-test] Sending test push to token:', token.substring(0, 20) + '...');

    // 呼叫 Expo Push API
    const expoResponse = await sendExpoPushNotification(token);

    // 印出 Expo API 的 response
    console.log('[POST /api/push/send-test] Expo API response:', JSON.stringify(expoResponse, null, 2));

    return NextResponse.json({
      ok: true,
      expoResponse,
    });
  } catch (error: any) {
    console.error('[POST /api/push/send-test] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '發送推播失敗' },
      { status: 500 }
    );
  }
}

