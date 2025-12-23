/**
 * 🧪 Email 測試 API
 * 
 * GET /api/test-email?to=xxx@example.com
 * 
 * 用於測試 Resend 設定是否正確
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const to = searchParams.get('to');
  
  if (!to) {
    return NextResponse.json(
      { error: 'Missing "to" parameter. Usage: /api/test-email?to=your@email.com' },
      { status: 400 }
    );
  }
  
  // 驗證 email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }
  
  console.log('[test-email] ========================================');
  console.log('[test-email] Sending test email to:', to);
  
  // 檢查環境變數
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    EMAIL_SEND_IN_DEV: process.env.EMAIL_SEND_IN_DEV === 'true',
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
  };
  
  console.log('[test-email] Environment check:', envCheck);
  
  if (envCheck.NODE_ENV === 'development' && !envCheck.EMAIL_SEND_IN_DEV) {
    console.warn('[test-email] ⚠️ EMAIL_SEND_IN_DEV is not "true" - Email will be simulated!');
    console.warn('[test-email] Set EMAIL_SEND_IN_DEV=true in .env.local to send real emails');
  }
  
  const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>測試 Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h1>✅ Email 測試成功！</h1>
  <p>如果你收到這封信，表示 Resend 設定正確。</p>
  <p>發送時間：${new Date().toLocaleString('zh-TW')}</p>
</body>
</html>
  `.trim();
  
  const testText = `
✅ Email 測試成功！

如果你收到這封信，表示 Resend 設定正確。

發送時間：${new Date().toLocaleString('zh-TW')}
  `.trim();
  
  try {
    const result = await sendEmail({
      to,
      subject: '🧪 BangBuy Email 測試',
      html: testHtml,
      text: testText,
      category: 'test',
      dedupeKey: `test_email_${Date.now()}`,
    });
    
    if (result.success) {
      console.log('[test-email] ✅ Sent successfully:', result.messageId);
      
      // 檢查是否為模擬發送
      const isSimulated = result.messageId?.startsWith('dev-') || result.skipped;
      
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: isSimulated 
          ? 'Test email simulated (not actually sent). Set EMAIL_SEND_IN_DEV=true to send real emails.'
          : 'Test email sent successfully',
        simulated: isSimulated,
        envCheck,
        reason: result.reason,
      });
    } else {
      console.error('[test-email] ❌ Failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          envStatus: result.envStatus,
          envCheck,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[test-email] ❌ Exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

