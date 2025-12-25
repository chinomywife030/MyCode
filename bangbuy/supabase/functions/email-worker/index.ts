/**
 * Email Worker - Supabase Edge Function
 * 
 * 處理 email_outbox 中的待發送郵件
 * 
 * 功能：
 * - 批次處理 20 筆 due 任務
 * - 狀態機：pending → processing → sent/failed
 * - 失敗重試（退避機制：1,2,5,10,30,60 分鐘）
 * - 使用 Resend API 發送
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================
// Types
// ============================================

interface EmailOutboxRecord {
  id: string
  kind: string
  user_id: string | null
  to_email: string
  payload: {
    message_id?: string
    conversation_id?: string
    sender_id?: string
    sender_name?: string
    content_preview?: string
    message_type?: string
    created_at?: string
    message_count?: number
  }
  dedupe_key: string | null
  status: 'pending' | 'processing' | 'sent' | 'failed'
  attempts: number
  next_attempt_at: string
  last_error: string | null
  created_at: string
  updated_at: string
}

interface ResendResponse {
  id?: string
  error?: {
    message: string
    name: string
  }
}

// ============================================
// Constants
// ============================================

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 6
const RETRY_DELAYS_MINUTES = [1, 2, 5, 10, 30, 60] // 退避時間

// ============================================
// Helpers
// ============================================

function getRetryDelay(attempts: number): number {
  const index = Math.min(attempts, RETRY_DELAYS_MINUTES.length - 1)
  return RETRY_DELAYS_MINUTES[index] * 60 * 1000 // 轉為毫秒
}

function buildEmailHtml(record: EmailOutboxRecord, appUrl: string): string {
  const { payload } = record
  const senderName = payload.sender_name || 'Someone'
  const contentPreview = payload.content_preview || '(No preview available)'
  const conversationId = payload.conversation_id || ''
  const messageCount = payload.message_count || 1
  
  const chatUrl = `${appUrl}/chat?conversation=${conversationId}`
  
  const messageLabel = messageCount > 1 
    ? `${messageCount} new messages` 
    : 'New message'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${messageLabel} from ${senderName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
        💬 ${messageLabel}
      </h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">
        <strong>${senderName}</strong> sent you a message:
      </p>
      
      <!-- Message Preview -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #4b5563; font-size: 15px; margin: 0; line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(contentPreview)}
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 24px;">
        <a href="${chatUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Conversation →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        You received this email because you have message notifications enabled.
        <br>
        <a href="${appUrl}/settings" style="color: #6366f1;">Manage notification settings</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildEmailText(record: EmailOutboxRecord, appUrl: string): string {
  const { payload } = record
  const senderName = payload.sender_name || 'Someone'
  const contentPreview = payload.content_preview || '(No preview available)'
  const conversationId = payload.conversation_id || ''
  const messageCount = payload.message_count || 1
  
  const chatUrl = `${appUrl}/chat?conversation=${conversationId}`
  
  const messageLabel = messageCount > 1 
    ? `${messageCount} new messages` 
    : 'New message'
  
  return `
${messageLabel} from ${senderName}

${senderName} sent you a message:

"${contentPreview}"

View the conversation: ${chatUrl}

---
You received this email because you have message notifications enabled.
Manage settings: ${appUrl}/settings
`
}

// ============================================
// Email Sending
// ============================================

async function sendEmail(
  record: EmailOutboxRecord,
  resendApiKey: string,
  emailFrom: string,
  appUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { payload } = record
  const senderName = payload.sender_name || 'Someone'
  const messageCount = payload.message_count || 1
  
  const subject = messageCount > 1
    ? `💬 ${messageCount} new messages from ${senderName}`
    : `💬 New message from ${senderName}`
  
  const html = buildEmailHtml(record, appUrl)
  const text = buildEmailText(record, appUrl)
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: record.to_email,
        subject,
        html,
        text,
        tags: [
          { name: 'category', value: 'message_notification' },
          { name: 'kind', value: record.kind },
        ],
      }),
    })
    
    const data: ResendResponse = await response.json()
    
    if (!response.ok) {
      const errorMessage = data.error?.message || `HTTP ${response.status}`
      console.error(`[email-worker] Resend error: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
    
    console.log(`[email-worker] ✅ Sent: ${data.id}`)
    return { success: true, messageId: data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[email-worker] Network error: ${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  const startTime = Date.now()
  console.log('[email-worker] ========================================')
  console.log('[email-worker] Processing email outbox...')
  
  try {
    // 1. 讀取環境變數
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('EMAIL_FROM')
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app.vercel.app'
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[email-worker] ❌ Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (!resendApiKey || !emailFrom) {
      console.error('[email-worker] ❌ Missing email credentials')
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY or EMAIL_FROM' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // 2. 建立 Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 3. 取得待處理的郵件（status = pending, next_attempt_at <= now）
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_outbox')
      .select('*')
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('next_attempt_at', { ascending: true })
      .limit(BATCH_SIZE)
    
    if (fetchError) {
      console.error('[email-worker] ❌ Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('[email-worker] No pending emails')
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending emails' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[email-worker] Found ${pendingEmails.length} pending emails`)
    
    // 4. 處理每封郵件
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      retrying: 0,
    }
    
    for (const record of pendingEmails as EmailOutboxRecord[]) {
      results.processed++
      
      // 4.1 標記為 processing
      await supabase
        .from('email_outbox')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id)
      
      // 4.2 發送郵件
      const sendResult = await sendEmail(record, resendApiKey, emailFrom, appUrl)
      
      if (sendResult.success) {
        // 4.3a 成功：更新狀態為 sent
        await supabase
          .from('email_outbox')
          .update({
            status: 'sent',
            attempts: record.attempts + 1,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)
        
        results.sent++
        console.log(`[email-worker] ✅ ${record.id} sent to ${record.to_email}`)
      } else {
        // 4.3b 失敗：判斷是否需要重試
        const newAttempts = record.attempts + 1
        
        if (newAttempts >= MAX_ATTEMPTS) {
          // 超過最大重試次數，標記為 failed
          await supabase
            .from('email_outbox')
            .update({
              status: 'failed',
              attempts: newAttempts,
              last_error: sendResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)
          
          results.failed++
          console.log(`[email-worker] ❌ ${record.id} failed permanently: ${sendResult.error}`)
        } else {
          // 計算下次重試時間
          const retryDelay = getRetryDelay(newAttempts)
          const nextAttemptAt = new Date(Date.now() + retryDelay).toISOString()
          
          await supabase
            .from('email_outbox')
            .update({
              status: 'pending',
              attempts: newAttempts,
              next_attempt_at: nextAttemptAt,
              last_error: sendResult.error,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id)
          
          results.retrying++
          console.log(`[email-worker] 🔄 ${record.id} retry scheduled at ${nextAttemptAt}`)
        }
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[email-worker] ========================================`)
    console.log(`[email-worker] Completed in ${duration}ms`)
    console.log(`[email-worker] Results: ${JSON.stringify(results)}`)
    
    return new Response(
      JSON.stringify({ ...results, duration_ms: duration }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[email-worker] ❌ Unexpected error: ${errorMessage}`)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})



