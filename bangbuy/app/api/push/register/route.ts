import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setToken, getToken } from '../tokenStore';

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
 * POST /api/push/register
 * 接收並存儲 Expo Push Token 到 Supabase
 * 
 * Body: { token: string, userId: string, platform?: "ios" | "android" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, platform } = body;

    // 驗證 token 存在且格式正確
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 token 參數或格式錯誤' },
        { status: 400 }
      );
    }

    // 驗證 token 格式（必須以 ExponentPushToken[ 開頭）
    if (!token.startsWith('ExponentPushToken[')) {
      return NextResponse.json(
        { ok: false, error: 'Token 格式錯誤，必須以 ExponentPushToken[ 開頭' },
        { status: 400 }
      );
    }

    // 驗證 userId 存在
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { ok: false, error: '缺少 userId 參數' },
        { status: 400 }
      );
    }

    console.log('[push/register] token received:', token.substring(0, 30) + '...', 'userId:', userId, 'platform:', platform);

    // 同時保留記憶體暫存（向後兼容）
    setToken(token);

    // 獲取 Supabase Admin Client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[push/register] Supabase not configured, using memory only');
      return NextResponse.json({ ok: true, storage: 'memory' });
    }

    // Upsert token 到 Supabase
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          token,
          user_id: userId,
          platform: platform || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'token',
        }
      );

    if (error) {
      console.error('[push/register] Supabase error:', error);
      // 即使 DB 失敗，記憶體暫存仍有效
      return NextResponse.json({ ok: true, storage: 'memory', dbError: error.message });
    }

    console.log('[push/register] Token saved to Supabase successfully');
    return NextResponse.json({ ok: true, storage: 'supabase' });
  } catch (error: any) {
    console.error('[push/register] Error:', error);
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
  const memoryToken = getToken();
  return NextResponse.json({
    ok: true,
    hasToken: memoryToken !== null,
    token: memoryToken ? `${memoryToken.substring(0, 20)}...` : null,
  });
}

