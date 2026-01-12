/**
 * 📧 Server-Only Email 發送工具
 * 
 * 🚨 只能在 Server 端使用（Server Actions、Route Handlers）
 * 提供完整的診斷輸出，方便快速排查寄信問題
 * 
 * 必要環境變數：
 * - RESEND_API_KEY: Resend API 金鑰
 * - EMAIL_FROM: 發信人（需在 Resend 驗證過）
 * - APP_URL: 應用程式網址
 * - EMAIL_SEND_IN_DEV: 開發模式是否真的發送（可選）
 */

import 'server-only';
import { Resend } from 'resend';
import { getSiteUrl } from '@/lib/siteUrl';

// ========== Types ==========

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ========== Environment Validation ==========

function validateEnv() {
  const missing: string[] = [];
  
  if (!process.env.RESEND_API_KEY) {
    missing.push('RESEND_API_KEY');
  }
  if (!process.env.EMAIL_FROM) {
    missing.push('EMAIL_FROM');
  }
  // APP_URL 不再必須，因為 getSiteUrl() 會處理
  
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
  
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    EMAIL_FROM: process.env.EMAIL_FROM!,
    // 🔐 使用統一的 site URL
    APP_URL: getSiteUrl(),
    EMAIL_SEND_IN_DEV: process.env.EMAIL_SEND_IN_DEV === 'true',
  };
}

// ========== Main Export ==========

/**
 * 發送 Email（Server-Only）
 * 
 * 特點：
 * - 寄信前輸出完整診斷資訊
 * - 失敗時輸出 Resend 完整錯誤內容
 * - 環境變數檢查嚴格（缺少則拋錯）
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text } = params;
  
  // 1. 驗證環境變數
  const env = validateEnv();
  
  // 2. 判斷是否為開發模式
  const isDev = process.env.NODE_ENV === 'development';
  const shouldSend = !isDev || env.EMAIL_SEND_IN_DEV;
  
  // 3. 寄信前診斷輸出
  console.log('═'.repeat(60));
  console.log('📧 [serverEmail] 寄信診斷資訊');
  console.log('─'.repeat(60));
  console.log(`  NODE_ENV:        ${process.env.NODE_ENV}`);
  console.log(`  EMAIL_FROM:      ${env.EMAIL_FROM}`);
  console.log(`  to:              ${to}`);
  console.log(`  subject:         ${subject}`);
  console.log(`  EMAIL_SEND_IN_DEV: ${env.EMAIL_SEND_IN_DEV}`);
  console.log(`  實際發送:        ${shouldSend ? '是' : '否（開發模式）'}`);
  console.log('═'.repeat(60));
  
  // 4. 開發模式且未設定強制發送，只 log 不發送
  if (!shouldSend) {
    console.log('📧 [serverEmail] DEV MODE - 模擬成功，未實際發送');
    return {
      success: true,
      id: `dev-mock-${Date.now()}`,
    };
  }
  
  // 5. 使用 Resend SDK 發送
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    
    if (error) {
      // 完整輸出 Resend 錯誤
      console.error('═'.repeat(60));
      console.error('❌ [serverEmail] Resend API 錯誤');
      console.error('─'.repeat(60));
      console.error('  錯誤內容:', JSON.stringify(error, null, 2));
      console.error('═'.repeat(60));
      
      throw new Error(error.message || 'Resend API error');
    }
    
    console.log(`✅ [serverEmail] 寄送成功！ Email ID: ${data?.id}`);
    
    return {
      success: true,
      id: data?.id,
    };
  } catch (err: any) {
    // 完整輸出錯誤內容
    console.error('═'.repeat(60));
    console.error('❌ [serverEmail] 發送失敗');
    console.error('─'.repeat(60));
    console.error('  錯誤類型:', err.name || 'Unknown');
    console.error('  錯誤訊息:', err.message || 'No message');
    if (err.statusCode) {
      console.error('  HTTP 狀態碼:', err.statusCode);
    }
    if (err.response) {
      console.error('  Response:', JSON.stringify(err.response, null, 2));
    }
    console.error('  完整錯誤物件:', JSON.stringify(err, null, 2));
    console.error('═'.repeat(60));
    
    // Rethrow 讓呼叫端處理
    throw err;
  }
}

// ========== Helper Exports ==========

export function getAppUrl(): string {
  const env = validateEnv();
  return env.APP_URL;
}

export function getEmailFrom(): string {
  const env = validateEnv();
  return env.EMAIL_FROM;
}


