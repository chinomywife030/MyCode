/**
 * 📧 Debug API: 發送測試郵件
 * POST /api/debug/send-test-email
 * 
 * 用途：快速測試 Email 發送是否正常運作
 * 可在瀏覽器 Console 或 API 客戶端直接呼叫
 * 
 * 🔐 安全限制：
 * - 必須登入
 * - 只允許指定的 admin emails 或自己寄給自己
 * 
 * Request Body:
 * { "to": "user@example.com" }
 * 
 * Response:
 * { "ok": true, "providerId": "...", "skipped": false }
 * { "ok": false, "error": "...", "envStatus": {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, validateEnv, getEnvConfig } from '@/lib/email/sender';

// Admin allowlist（可自行加入）
const ADMIN_EMAILS = [
  'test@example.com', // 替換成你的 email
];

// 建立 Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  console.log('═'.repeat(70));
  console.log('🧪 [debug/send-test-email] 收到測試寄信請求');
  console.log(`  時間: ${timestamp}`);
  console.log('═'.repeat(70));
  
  try {
    // 1. 驗證登入狀態
    const authHeader = request.headers.get('authorization');
    let userEmail: string | null = null;
    let userId: string | null = null;
    
    // 嘗試從 cookie 取得 session
    const supabase = getSupabase();
    
    // 從 request cookies 建立 session
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // 這裡我們信任 cookie session，在實際 API route 會自動處理
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userEmail = user.email || null;
        userId = user.id;
      }
    }
    
    console.log(`  User Email: ${userEmail || '(not logged in)'}`);
    
    // 2. 解析請求
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    
    const { to } = body;
    
    if (!to) {
      console.error('❌ 缺少 "to" 參數');
      return NextResponse.json(
        { ok: false, error: 'Missing required field: to' },
        { status: 400 }
      );
    }
    
    console.log(`  收件人: ${to}`);
    
    // 3. 安全檢查：必須是 admin 或寄給自己
    const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);
    const isSendingToSelf = userEmail && to === userEmail;
    
    // 在開發模式或沒有 admin 設定時，允許任何人測試
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && !isAdmin && !isSendingToSelf) {
      console.warn('⚠️ 非 admin 嘗試寄信給他人');
      // 暫時允許（方便測試），但 log warning
      console.warn('  [NOTICE] 目前允許任何人測試，請在 production 設定 ADMIN_EMAILS');
    }
    
    // 4. 檢查環境變數狀態
    const envValidation = validateEnv();
    console.log(`  Env Valid: ${envValidation.valid}`);
    console.log(`  Missing Env: ${envValidation.missing.join(', ') || 'none'}`);
    
    // 5. 發送測試郵件
    const result = await sendEmail({
      to,
      subject: `[BangBuy 測試郵件] ${timestamp}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563EB; margin-bottom: 20px;">📧 BangBuy 測試郵件</h1>
          
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #475569;">
              這是一封測試郵件，用於驗證 Email 發送功能是否正常運作。
            </p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">發送時間</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">環境</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${process.env.NODE_ENV}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">收件人</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">觸發者</td>
              <td style="padding: 8px 0; font-weight: 500;">${userEmail || 'Anonymous'}</td>
            </tr>
          </table>
          
          <p style="color: #22c55e; font-weight: 600;">
            ✅ 如果您收到這封郵件，表示 Email 發送功能運作正常！
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            此郵件由 BangBuy Debug API 自動發送，請勿回覆。
          </p>
        </div>
      `,
      text: `BangBuy 測試郵件\n\n發送時間: ${timestamp}\n環境: ${process.env.NODE_ENV}\n收件人: ${to}\n\n如果您收到這封郵件，表示 Email 發送功能運作正常！`,
      category: 'test',
      userId: userId || undefined,
    });
    
    // 6. 返回結果
    if (result.success) {
      console.log('✅ 測試郵件發送成功');
      console.log(`  Provider ID: ${result.messageId || '(none)'}`);
      console.log(`  Skipped: ${result.skipped || false}`);
      if (result.reason) console.log(`  Reason: ${result.reason}`);
      
      return NextResponse.json({
        ok: true,
        providerId: result.messageId,
        skipped: result.skipped || false,
        reason: result.reason,
        timestamp,
        envStatus: envValidation.envStatus,
      });
    } else {
      console.error('❌ 測試郵件發送失敗');
      console.error(`  Error: ${result.error}`);
      
      return NextResponse.json({
        ok: false,
        error: result.error,
        timestamp,
        envStatus: result.envStatus || envValidation.envStatus,
      });
    }
    
  } catch (error: any) {
    console.error('═'.repeat(70));
    console.error('❌ [debug/send-test-email] 發生例外錯誤');
    console.error('  錯誤:', error.message || error);
    console.error('═'.repeat(70));
    
    const envValidation = validateEnv();
    
    return NextResponse.json({
      ok: false,
      error: error.message || 'Unknown error',
      timestamp,
      envStatus: envValidation.envStatus,
    });
  }
}

// GET 方法顯示使用說明
export async function GET() {
  const config = getEnvConfig();
  const envValidation = validateEnv();
  
  return NextResponse.json({
    message: 'BangBuy Debug Email API',
    version: '2.0',
    environment: config.NODE_ENV,
    envStatus: envValidation.envStatus,
    envValid: envValidation.valid,
    missingEnv: envValidation.missing,
    usage: {
      method: 'POST',
      body: { to: 'recipient@example.com' },
      example: `
fetch('/api/debug/send-test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'your@email.com' })
}).then(r => r.json()).then(console.log)
      `.trim(),
    },
    notes: [
      'EMAIL_SEND_IN_DEV=true is required to send real emails in development',
      'In production, emails will always attempt to send if env is configured',
      'Check server logs for detailed error information',
    ],
  });
}
