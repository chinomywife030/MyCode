import { NextRequest, NextResponse } from 'next/server';
import { setToken, getToken } from '../tokenStore';

export const runtime = 'nodejs';

/**
 * POST /api/push/register
 * 接收並暫存 Expo Push Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // 驗證 token 存在
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 token 參數或格式錯誤' },
        { status: 400 }
      );
    }

    // 暫存 token
    setToken(token);

    // 印出收到的 token
    console.log('[push/register] token received:', token);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[POST /api/push/register] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '註冊失敗' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push/register
 * 查詢目前暫存的 token（用於測試）
 */
export async function GET() {
  const token = getToken();
  return NextResponse.json({
    ok: true,
    hasToken: token !== null,
    token: token ? `${token.substring(0, 20)}...` : null,
  });
}

