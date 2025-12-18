/**
 * 📧 Debug API: 發送測試郵件
 * POST /api/debug/send-test-email
 * 
 * 用途：快速測試 Email 發送是否正常運作
 * 可在瀏覽器 Console 或 API 客戶端直接呼叫
 * 
 * Request Body:
 * { "to": "user@example.com" }
 * 
 * Response:
 * { "ok": true, "id": "..." } 或 { "ok": false, "error": "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/serverEmail';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  console.log('═'.repeat(60));
  console.log('🧪 [debug/send-test-email] 收到測試寄信請求');
  console.log(`  時間: ${timestamp}`);
  console.log('═'.repeat(60));
  
  try {
    // 1. 解析請求
    const body = await request.json();
    const { to } = body;
    
    if (!to) {
      console.error('❌ [debug/send-test-email] 缺少 "to" 參數');
      return NextResponse.json(
        { ok: false, error: 'Missing required field: to' },
        { status: 400 }
      );
    }
    
    console.log(`  收件人: ${to}`);
    
    // 2. 發送測試郵件
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
              <td style="padding: 8px 0; color: #64748b;">收件人</td>
              <td style="padding: 8px 0; font-weight: 500;">${to}</td>
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
    });
    
    console.log('✅ [debug/send-test-email] 測試郵件發送成功');
    console.log(`  Email ID: ${result.id}`);
    
    return NextResponse.json({
      ok: true,
      id: result.id,
      timestamp,
    });
    
  } catch (error: any) {
    console.error('═'.repeat(60));
    console.error('❌ [debug/send-test-email] 測試郵件發送失敗');
    console.error('  錯誤:', error.message || error);
    console.error('═'.repeat(60));
    
    return NextResponse.json({
      ok: false,
      error: error.message || 'Unknown error',
      timestamp,
    });
  }
}

// 提供 GET 方法顯示使用說明
export async function GET() {
  return NextResponse.json({
    message: 'BangBuy Debug Email API',
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
  });
}

