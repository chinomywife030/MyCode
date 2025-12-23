/**
 * 🧪 Email 測試 API
 * 
 * GET /api/test-email?to=xxx@example.com
 * 
 * 用於測試 Resend 設定是否正確（Production 可用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';

export const runtime = 'nodejs';

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
  
  // 檢查環境變數（mask key）
  const enabled = process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS === 'true';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || '';
  
  const envCheck = {
    enabled,
    nodeEnv,
    hasResendKey,
    from: from ? `${from.substring(0, 3)}***@${from.split('@')[1] || '***'}` : '(not set)',
  };
  
  console.log('[test-email] Environment status:', envCheck);
  
  // 檢查缺失的環境變數
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');
  
  if (missing.length > 0) {
    console.error('[test-email] ❌ Missing environment variables:', missing);
    return NextResponse.json(
      {
        ok: false,
        error: `Missing environment variables: ${missing.join(', ')}`,
        missing,
      },
      { status: 500 }
    );
  }
  
  if (nodeEnv === 'development' && process.env.EMAIL_SEND_IN_DEV !== 'true') {
    console.warn('[test-email] ⚠️ EMAIL_SEND_IN_DEV is not "true" - Email will be simulated!');
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
        ok: true,
        messageId: result.messageId,
        simulated: isSimulated,
        envCheck,
      });
    } else {
      console.error('[test-email] ❌ Failed:', result.error);
      console.error('[test-email] Resend error response:', JSON.stringify(result, null, 2));
      
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'Unknown error',
          envCheck,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[test-email] ❌ Exception:', error);
    console.error('[test-email] Error stack:', error.stack);
    
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

