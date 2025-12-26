import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * 🔐 重新寄送 Email 驗證信
 * 
 * POST /api/auth/resend-confirmation
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // 創建 Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // 重新寄送驗證信
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    
    if (error) {
      console.error('[Resend Confirmation] Error:', error);
      
      // 處理常見錯誤
      if (error.message?.includes('rate limit') || error.message?.includes('Email rate limit exceeded')) {
        return NextResponse.json(
          { error: 'rate_limit', message: '寄送頻率過高，請稍後再試' },
          { status: 429 }
        );
      }
      
      if (error.message?.includes('not found') || error.message?.includes('User not found')) {
        return NextResponse.json(
          { error: 'user_not_found', message: '找不到該用戶' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'unknown', message: error.message || '寄送失敗' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '驗證信已重新寄出',
    });
    
  } catch (error: any) {
    console.error('[Resend Confirmation] Exception:', error);
    return NextResponse.json(
      { error: 'server_error', message: '伺服器錯誤' },
      { status: 500 }
    );
  }
}















