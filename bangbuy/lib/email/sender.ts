/**
 * 📧 Email 發送模組 - 單一入口
 * 支援 Resend API（優先）或 SMTP fallback
 * 包含去重複（dedupe）與節流（throttle）機制
 */

import { createClient } from '@supabase/supabase-js';

// ========== Types ==========

export type EmailCategory = 
  | 'offer_created' 
  | 'offer_accepted' 
  | 'offer_rejected' 
  | 'message_digest'
  | 'system';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
  dedupeKey: string;
  userId: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

// ========== Configuration ==========

const DEDUPE_WINDOW_MINUTES = 10;
const THROTTLE_WINDOW_MINUTES = 10;
const THROTTLE_MAX_EMAILS = 3;

// 環境變數
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'BangBuy <support@bangbuy.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Supabase Admin Client (for server-side operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    console.warn('[Email] No SUPABASE_SERVICE_ROLE_KEY, using anon key for email operations');
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ========== Dedupe & Throttle ==========

async function checkDedupeAndThrottle(
  userId: string,
  dedupeKey: string
): Promise<{ canSend: boolean; reason?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const windowStart = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();

    // 1. 檢查去重複：同一 dedupeKey 在時間窗口內是否已存在
    const { data: existingDedupe } = await supabase
      .from('email_outbox')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .gte('created_at', windowStart)
      .in('status', ['sent', 'queued'])
      .limit(1);

    if (existingDedupe && existingDedupe.length > 0) {
      return { canSend: false, reason: `Dedupe: ${dedupeKey} already sent within ${DEDUPE_WINDOW_MINUTES} minutes` };
    }

    // 2. 檢查節流：同一用戶在時間窗口內的發送數量
    const throttleStart = new Date(Date.now() - THROTTLE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', throttleStart)
      .in('status', ['sent', 'queued']);

    if (count !== null && count >= THROTTLE_MAX_EMAILS) {
      return { canSend: false, reason: `Throttle: User ${userId} exceeded ${THROTTLE_MAX_EMAILS} emails in ${THROTTLE_WINDOW_MINUTES} minutes` };
    }

    return { canSend: true };
  } catch (error) {
    console.error('[Email] Dedupe/Throttle check failed:', error);
    // 如果檢查失敗，允許發送（fail-open）
    return { canSend: true };
  }
}

// ========== Email Sending ==========

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        tags: [
          { name: 'category', value: params.category },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Resend API error' };
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Resend request failed' };
  }
}

async function sendViaSMTP(params: SendEmailParams): Promise<SendEmailResult> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    // 動態 import nodemailer（只在需要時載入）
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message || 'SMTP send failed' };
  }
}

// ========== Main Export ==========

/**
 * 發送 Email（單一入口）
 * - 自動選擇 Resend 或 SMTP
 * - 支援去重複與節流
 * - 失敗不會阻斷主流程
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, category, dedupeKey, userId } = params;

  // 開發模式：只 log 不發送
  const isDev = process.env.NODE_ENV === 'development' && !process.env.EMAIL_SEND_IN_DEV;
  
  try {
    // 1. 檢查去重複與節流
    const { canSend, reason } = await checkDedupeAndThrottle(userId, dedupeKey);
    
    if (!canSend) {
      console.log(`[Email] Skipped: ${reason}`);
      
      // 記錄到 outbox（status = skipped）
      await recordToOutbox({
        ...params,
        status: 'skipped',
        error: reason,
      });
      
      return { success: true, skipped: true, reason };
    }

    // 2. 開發模式處理
    if (isDev) {
      console.log('═'.repeat(60));
      console.log('[Email] DEV MODE - Would send email:');
      console.log(`  To: ${to}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Category: ${category}`);
      console.log(`  DedupeKey: ${dedupeKey}`);
      console.log('═'.repeat(60));
      
      await recordToOutbox({
        ...params,
        status: 'sent',
        messageId: `dev-${Date.now()}`,
      });
      
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    // 3. 先記錄到 outbox（queued）
    const outboxId = await recordToOutbox({
      ...params,
      status: 'queued',
    });

    // 4. 嘗試發送
    let result: SendEmailResult;
    
    if (RESEND_API_KEY) {
      result = await sendViaResend(params);
    } else if (SMTP_HOST) {
      result = await sendViaSMTP(params);
    } else {
      result = { success: false, error: 'No email provider configured (RESEND_API_KEY or SMTP)' };
    }

    // 5. 更新 outbox 狀態
    await updateOutboxStatus(outboxId, result);

    if (!result.success) {
      console.error(`[Email] Send failed: ${result.error}`);
    } else {
      console.log(`[Email] Sent successfully: ${result.messageId}`);
    }

    return result;
  } catch (error: any) {
    console.error('[Email] Unexpected error:', error);
    
    // 記錄失敗但不阻斷主流程
    await recordToOutbox({
      ...params,
      status: 'failed',
      error: error.message,
    });
    
    return { success: false, error: error.message };
  }
}

// ========== Outbox Helpers ==========

interface OutboxRecord extends SendEmailParams {
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
}

async function recordToOutbox(record: OutboxRecord): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('email_outbox')
      .insert({
        user_id: record.userId,
        to_email: record.to,
        subject: record.subject,
        category: record.category,
        dedupe_key: record.dedupeKey,
        status: record.status,
        error: record.error,
        message_id: record.messageId,
        sent_at: record.status === 'sent' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Email] Failed to record to outbox:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('[Email] Outbox record error:', error);
    return null;
  }
}

async function updateOutboxStatus(
  outboxId: string | null,
  result: SendEmailResult
): Promise<void> {
  if (!outboxId) return;

  try {
    const supabase = getSupabaseAdmin();
    
    await supabase
      .from('email_outbox')
      .update({
        status: result.success ? 'sent' : 'failed',
        error: result.error,
        message_id: result.messageId,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', outboxId);
  } catch (error) {
    console.error('[Email] Failed to update outbox status:', error);
  }
}

// ========== Utility Exports ==========

export { APP_URL, EMAIL_FROM };


