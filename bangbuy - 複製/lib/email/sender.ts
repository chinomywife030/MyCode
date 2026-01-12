/**
 * 📧 Email 發送模組 - Server-Only 單一入口
 * 
 * ⚠️ 此模組只能在 Server 端使用（API Routes, Server Actions）
 * 絕對不可在 Client Component 直接呼叫
 * 
 * 功能：
 * - Resend API 發送
 * - 完整 env 檢查與錯誤日誌
 * - 去重複與節流機制
 * - 開發模式模擬發送
 */

import { createClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/siteUrl';
import { logEmailSend, generateRequestId } from '@/lib/logger';

// ========== Types ==========

export type EmailCategory = 
  | 'offer_created' 
  | 'offer_accepted' 
  | 'offer_rejected' 
  | 'message_digest'
  | 'message_reminder'
  | 'test'
  | 'system';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
  dedupeKey?: string;
  userId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
  envStatus?: Record<string, boolean>;
  /** 請求追蹤 ID（用於 debug） */
  requestId?: string;
}

// ========== Environment Variables ==========

function getEnvConfig() {
  const config = {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    EMAIL_FROM: process.env.EMAIL_FROM || '',
    // 🔐 使用統一的 site URL，確保 Email 連結正確
    APP_URL: getSiteUrl(),
    EMAIL_SEND_IN_DEV: process.env.EMAIL_SEND_IN_DEV === 'true',
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
  
  return config;
}

function validateEnv(): { valid: boolean; missing: string[]; envStatus: Record<string, boolean> } {
  const config = getEnvConfig();
  const missing: string[] = [];
  
  const envStatus: Record<string, boolean> = {
    RESEND_API_KEY: !!config.RESEND_API_KEY,
    EMAIL_FROM: !!config.EMAIL_FROM,
    APP_URL: !!config.APP_URL,
    SUPABASE_URL: !!config.SUPABASE_URL,
  };
  
  if (!config.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!config.EMAIL_FROM) missing.push('EMAIL_FROM');
  
  return {
    valid: missing.length === 0,
    missing,
    envStatus,
  };
}

// ========== Logging ==========

function logEmailAttempt(params: SendEmailParams, extra?: Record<string, any>) {
  const config = getEnvConfig();
  const timestamp = new Date().toISOString();
  
  // Mask API key（只顯示前 4 個字元）
  const maskedKey = config.RESEND_API_KEY 
    ? `${config.RESEND_API_KEY.substring(0, 4)}***${config.RESEND_API_KEY.substring(config.RESEND_API_KEY.length - 4)}`
    : '(not set)';
  
  // Mask email from（只顯示前 3 個字元和域名）
  const maskedFrom = config.EMAIL_FROM
    ? `${config.EMAIL_FROM.substring(0, 3)}***@${config.EMAIL_FROM.split('@')[1] || '***'}`
    : '(not set)';
  
  console.log('═'.repeat(70));
  console.log(`[Email] ${timestamp}`);
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  ENABLE_MESSAGE_EMAIL_NOTIFICATIONS: ${process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS === 'true'}`);
  console.log(`  EMAIL_SEND_IN_DEV: ${config.EMAIL_SEND_IN_DEV}`);
  console.log(`  RESEND_API_KEY: ${maskedKey}`);
  console.log(`  EMAIL_FROM: ${maskedFrom}`);
  console.log(`  To: ${params.to}`);
  console.log(`  Subject: ${params.subject}`);
  console.log(`  Category: ${params.category}`);
  if (params.dedupeKey) console.log(`  DedupeKey: ${params.dedupeKey}`);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
  console.log('═'.repeat(70));
}

function logError(message: string, error?: any) {
  console.error(`[Email] ❌ ${message}`);
  if (error) {
    if (typeof error === 'object') {
      console.error(`[Email] Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.error(`[Email] Error:`, error);
    }
  }
}

function logSuccess(messageId: string) {
  console.log(`[Email] ✅ Sent successfully`);
  console.log(`[Email] Provider ID: ${messageId}`);
}

// ========== Supabase Admin Client ==========

function getSupabaseAdmin() {
  const config = getEnvConfig();
  
  if (!config.SUPABASE_URL) {
    console.warn('[Email] NEXT_PUBLIC_SUPABASE_URL not set');
    return null;
  }
  
  if (config.SUPABASE_SERVICE_KEY) {
    return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
  }
  
  // Fallback to anon key (limited permissions)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    console.warn('[Email] Using anon key for email operations (limited permissions)');
    return createClient(config.SUPABASE_URL, anonKey);
  }
  
  return null;
}

// ========== Dedupe & Throttle ==========

const DEDUPE_WINDOW_MINUTES = 10;
const THROTTLE_WINDOW_MINUTES = 10;
const THROTTLE_MAX_EMAILS = 5;

async function checkDedupeAndThrottle(
  userId: string | undefined,
  dedupeKey: string | undefined
): Promise<{ canSend: boolean; reason?: string }> {
  if (!dedupeKey && !userId) {
    return { canSend: true };
  }
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[Email] No Supabase client for dedupe check, allowing send');
      return { canSend: true };
    }
    
    const windowStart = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();

    // 1. 檢查去重複
    if (dedupeKey) {
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
    }

    // 2. 檢查節流
    if (userId) {
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
    }

    return { canSend: true };
  } catch (error) {
    console.error('[Email] Dedupe/Throttle check failed:', error);
    return { canSend: true }; // Fail-open
  }
}

// ========== Outbox Recording ==========

async function recordToOutbox(params: {
  userId?: string;
  to: string;
  subject: string;
  category: EmailCategory;
  dedupeKey?: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
}): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[Email] No Supabase client for outbox recording');
      return null;
    }
    
    const { data, error } = await supabase
      .from('email_outbox')
      .insert({
        user_id: params.userId || null,
        to_email: params.to,
        subject: params.subject,
        category: params.category,
        dedupe_key: params.dedupeKey || null,
        status: params.status,
        error: params.error,
        message_id: params.messageId,
        sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      // Table might not exist, that's OK
      if (error.code !== '42P01') {
        console.warn('[Email] Failed to record to outbox:', error.message);
      }
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.warn('[Email] Outbox record error:', error);
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
    if (!supabase) return;
    
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
    console.warn('[Email] Failed to update outbox status:', error);
  }
}

// ========== Resend API ==========

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const config = getEnvConfig();
  
  if (!config.RESEND_API_KEY) {
    logError('RESEND_API_KEY not configured');
    return { success: false, error: 'Missing env: RESEND_API_KEY' };
  }
  
  if (!config.EMAIL_FROM) {
    logError('EMAIL_FROM not configured');
    return { success: false, error: 'Missing env: EMAIL_FROM' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
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
      // 完整輸出 Resend 錯誤
      console.error('[Email] ❌ Resend API error');
      console.error('[Email] Status:', response.status, response.statusText);
      console.error('[Email] Resend error response:', JSON.stringify(data, null, 2));
      
      logError('Resend API error', {
        status: response.status,
        statusText: response.statusText,
        body: data,
      });
      
      // 檢查常見錯誤
      const errorMessage = data.message || data.error || 'Unknown Resend error';
      
      if (errorMessage.includes('domain') || errorMessage.includes('verified')) {
        console.error('[Email] Domain verification issue - EMAIL_FROM domain may not be verified in Resend');
        logError('Domain verification issue - EMAIL_FROM domain may not be verified in Resend');
      }
      if (errorMessage.includes('api_key') || errorMessage.includes('unauthorized')) {
        console.error('[Email] API key issue - RESEND_API_KEY may be invalid or have insufficient permissions');
        logError('API key issue - RESEND_API_KEY may be invalid or have insufficient permissions');
      }
      
      return { success: false, error: `Resend: ${errorMessage}`, envStatus: { resendError: data } };
    }

    console.log('[Email] ✅ Sent successfully via Resend:', data.id);
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('[Email] ❌ Resend request failed:', error);
    console.error('[Email] Error stack:', error.stack);
    logError('Resend request failed', error);
    return { success: false, error: `Network error: ${error.message || 'Unknown'}` };
  }
}

// ========== Main Export ==========

/**
 * 發送 Email（Server-Only 單一入口）
 * 
 * @param params - 發送參數
 * @returns SendEmailResult - 發送結果
 * 
 * ⚠️ 只能在 Server 端呼叫
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const config = getEnvConfig();
  const { to, subject, category, dedupeKey, userId } = params;
  
  // 🔐 生成 request ID 用於追蹤
  const requestId = generateRequestId();
  
  // 1. 驗證環境變數
  const envValidation = validateEnv();
  
  // 2. Log 發送嘗試
  logEmailAttempt(params, {
    'Env Valid': envValidation.valid,
    'Missing Env': envValidation.missing.join(', ') || 'none',
  });
  
  // 3. 如果缺少必要 env，直接返回錯誤
  if (!envValidation.valid) {
    const errorMsg = `Missing required environment variables: ${envValidation.missing.join(', ')}`;
    logError(errorMsg);
    
    await recordToOutbox({
      userId,
      to,
      subject,
      category,
      dedupeKey,
      status: 'failed',
      error: errorMsg,
    });
    
    return { 
      success: false, 
      error: errorMsg,
      envStatus: envValidation.envStatus,
    };
  }
  
  try {
    // 4. 檢查去重複與節流
    const { canSend, reason } = await checkDedupeAndThrottle(userId, dedupeKey);
    
    if (!canSend) {
      console.log(`[Email] Skipped: ${reason}`);
      
      await recordToOutbox({
        userId,
        to,
        subject,
        category,
        dedupeKey,
        status: 'skipped',
        error: reason,
      });
      
      return { success: true, skipped: true, reason };
    }

    // 5. 開發模式處理
    const isDev = config.NODE_ENV === 'development';
    
    if (isDev && !config.EMAIL_SEND_IN_DEV) {
      console.log('[Email] 📧 DEV MODE - Email simulated (not actually sent)');
      console.log('[Email] Set EMAIL_SEND_IN_DEV=true to send real emails in development');
      
      const devMessageId = `dev-${Date.now()}`;
      
      await recordToOutbox({
        userId,
        to,
        subject,
        category,
        dedupeKey,
        status: 'sent',
        messageId: devMessageId,
      });
      
      return { 
        success: true, 
        messageId: devMessageId, 
        skipped: true,
        reason: 'Development mode - email simulated',
      };
    }

    // 6. 記錄到 outbox（queued）
    const outboxId = await recordToOutbox({
      userId,
      to,
      subject,
      category,
      dedupeKey,
      status: 'queued',
    });

    // 7. 發送
    const result = await sendViaResend(params);

    // 8. 更新 outbox 狀態
    await updateOutboxStatus(outboxId, result);

    if (result.success && result.messageId) {
      logSuccess(result.messageId);
      // 📊 結構化日誌
      logEmailSend({
        requestId,
        to,
        template: category,
        result: 'success',
        providerId: result.messageId,
      });
    } else if (!result.success) {
      // 📊 結構化日誌
      logEmailSend({
        requestId,
        to,
        template: category,
        result: 'fail',
        errorMessage: result.error,
      });
    }

    // 加入 requestId 到回傳結果
    return { ...result, requestId };
  } catch (error: any) {
    logError('Unexpected error in sendEmail', error);
    
    // 📊 結構化日誌
    logEmailSend({
      requestId,
      to,
      template: category,
      result: 'fail',
      errorCode: 'EXCEPTION',
      errorMessage: error.message,
    });
    
    await recordToOutbox({
      userId,
      to,
      subject,
      category,
      dedupeKey,
      status: 'failed',
      error: error.message,
    });
    
    return { success: false, error: error.message, requestId };
  }
}

// ========== Utility Exports ==========

export { getEnvConfig, validateEnv };

/**
 * 取得 APP_URL（用於建構連結）
 */
export function getAppUrl(): string {
  return getEnvConfig().APP_URL;
}

/**
 * 取得 EMAIL_FROM（用於顯示）
 */
export function getEmailFrom(): string {
  return getEnvConfig().EMAIL_FROM;
}
