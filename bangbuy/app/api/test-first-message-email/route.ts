/**
 * 🧪 測試第一則私訊 Email 通知
 * 
 * GET /api/test-first-message-email?to=your@email.com
 * 
 * ⚠️ 僅供測試使用，生產環境應該禁用
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/sender';
import { newMessageEmail } from '@/lib/email/templates/newMessage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('[Test Email] ========================================');
  console.log('[Test Email] GET /api/test-first-message-email');
  console.log('[Test Email] Timestamp:', new Date().toISOString());
  
  // 檢查環境變數
  const envStatus = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.substring(0, 8)}...` : '(not set)',
    EMAIL_FROM: process.env.EMAIL_FROM || '(not set)',
    ENABLE_MESSAGE_EMAIL_NOTIFICATIONS: process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS,
    NODE_ENV: process.env.NODE_ENV,
  };
  
  console.log('[Test Email] Environment variables:');
  console.log('[Test Email]   RESEND_API_KEY:', envStatus.RESEND_API_KEY);
  console.log('[Test Email]   EMAIL_FROM:', envStatus.EMAIL_FROM);
  console.log('[Test Email]   ENABLE_MESSAGE_EMAIL_NOTIFICATIONS:', envStatus.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS);
  console.log('[Test Email]   NODE_ENV:', envStatus.NODE_ENV);
  
  // 從 query 取得測試 email
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('to');
  
  if (!testEmail) {
    return NextResponse.json({
      success: false,
      error: 'Missing "to" query parameter. Usage: /api/test-first-message-email?to=your@email.com',
      envStatus,
    }, { status: 400 });
  }
  
  console.log('[Test Email] Test email recipient:', testEmail);
  
  // 檢查必要的環境變數
  if (!process.env.RESEND_API_KEY) {
    console.error('[Test Email] ❌ RESEND_API_KEY is not set');
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY is not set in environment variables',
      envStatus,
    }, { status: 500 });
  }
  
  if (!process.env.EMAIL_FROM) {
    console.error('[Test Email] ❌ EMAIL_FROM is not set');
    return NextResponse.json({
      success: false,
      error: 'EMAIL_FROM is not set in environment variables',
      envStatus,
    }, { status: 500 });
  }
  
  // 生成測試 Email 內容
  const { html, text, subject } = newMessageEmail({
    recipientName: 'Test User',
    senderName: 'BangBuy Test',
    messageSnippet: '這是一封測試郵件，用於驗證第一則私訊 Email 通知功能是否正常運作。',
    conversationId: 'test-conversation-id',
    messageType: 'FIRST_MESSAGE',
  });
  
  console.log('[Test Email] Sending test email...');
  console.log('[Test Email] Subject:', subject);
  
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
      text,
      category: 'test',
      dedupeKey: `test-first-message:${Date.now()}`,
    });
    
    if (result.success) {
      console.log('[Test Email] ✅ Email sent successfully');
      console.log('[Test Email] Resend messageId:', result.messageId);
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
        messageId: result.messageId,
        envStatus,
      });
    } else {
      console.error('[Test Email] ❌ Email send failed');
      console.error('[Test Email] Error:', result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        envStatus,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Test Email] ❌ Exception:', error.message);
    console.error('[Test Email] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      envStatus,
    }, { status: 500 });
  }
}

