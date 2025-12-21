import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logAuthCallback, generateRequestId } from '@/lib/logger';

/**
 * 🔐 Auth Callback 處理
 * 
 * 處理 Supabase Auth 的回調，包括：
 * - OAuth 登入（Google 等）
 * - Email 驗證連結
 * - 密碼重設連結
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  
  // 🔐 生成 request ID 用於追蹤
  const requestId = generateRequestId();

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    try {
      // 交換 Session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Exchange error:', error);
        // 📊 結構化日誌
        logAuthCallback({
          requestId,
          type: type || 'oauth',
          result: 'fail',
          errorCode: 'EXCHANGE_ERROR',
          errorMessage: error.message,
        });
        // 發生錯誤，導向登入頁
        return NextResponse.redirect(`${requestUrl.origin}/login`);
      }

      // 🆕 如果是 email 驗證（type=signup 或 type=email_change）
      if (type === 'signup' || type === 'email_change') {
        // 驗證成功，檢查 email_confirmed_at
        if (data.user?.email_confirmed_at) {
          // Email 已驗證，導向首頁
          return NextResponse.redirect(requestUrl.origin);
        } else {
          // 還未驗證（不應該發生，但以防萬一）
          return NextResponse.redirect(`${requestUrl.origin}/verify-email`);
        }
      }

      // 🆕 如果是密碼重設
      if (type === 'recovery') {
        return NextResponse.redirect(`${requestUrl.origin}/reset-password`);
      }

      // 其他情況（OAuth 登入等），檢查 email 驗證狀態
      if (data.user && !data.user.email_confirmed_at) {
        // Email 未驗證
        return NextResponse.redirect(`${requestUrl.origin}/verify-email`);
      }
      
      // 📊 結構化日誌 - 成功
      logAuthCallback({
        requestId,
        type: type || 'oauth',
        result: 'success',
      });
      
      // 🔐 OAuth 登入成功，導向 auth/redirect 頁面（client-side 處理 returnTo）
      return NextResponse.redirect(`${requestUrl.origin}/auth/redirect`);
      
    } catch (err: any) {
      console.error('[Auth Callback] Error:', err);
      // 📊 結構化日誌
      logAuthCallback({
        requestId,
        type: type || 'oauth',
        result: 'fail',
        errorCode: 'EXCEPTION',
        errorMessage: err.message,
      });
      return NextResponse.redirect(`${requestUrl.origin}/login`);
    }
  }

  // 📊 結構化日誌 - 無 code
  logAuthCallback({
    requestId,
    type: 'no_code',
    result: 'success',
  });

  // 🔐 無 code 時也導向 redirect 頁面處理
  return NextResponse.redirect(`${requestUrl.origin}/auth/redirect`);
}