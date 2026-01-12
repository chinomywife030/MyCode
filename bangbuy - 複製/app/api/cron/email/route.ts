/**
 * 📧 First Message Email Cron Route
 * 
 * GET /api/cron/email
 * 
 * 處理第一則私訊 Email 通知的 Cron Job
 * 
 * Query Parameters:
 * - ?forceTest=1: 強制測試模式，直接寄信給固定測試 email（不查 DB）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/sender';
import { newMessageEmail } from '@/lib/email/templates/newMessage';
import { getSiteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最長執行 60 秒

// Supabase Admin Client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey);
}

/**
 * 強制測試模式：直接寄信給固定測試 email
 */
async function sendTestEmail(testEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log('[CRON EMAIL] ========== FORCE TEST MODE ==========');
  console.log('[CRON EMAIL] Test email:', testEmail);
  
  try {
    const { html, text, subject } = newMessageEmail({
      recipientName: 'Test User',
      senderName: 'Test Sender',
      messageSnippet: 'This is a test email for first message notification.',
      conversationId: 'test-conversation-id',
      messageType: 'FIRST_MESSAGE',
    });
    
    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
      text,
      category: 'message_digest',
      dedupeKey: `test:${Date.now()}`,
      userId: 'test-user-id',
    });
    
    if (result.success) {
      console.log('[CRON EMAIL] ✅ TEST EMAIL SENT SUCCESSFULLY');
      console.log('[CRON EMAIL] Resend messageId:', result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('[CRON EMAIL] ❌ TEST EMAIL FAILED');
      console.error('[CRON EMAIL] Error:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[CRON EMAIL] ❌ TEST EMAIL EXCEPTION');
    console.error('[CRON EMAIL] Error:', error.message);
    console.error('[CRON EMAIL] Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 處理第一則私訊 Email 通知
 */
async function processFirstMessageEmails(): Promise<{
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{
    messageId: string;
    receiverEmail: string;
    status: 'sent' | 'skipped' | 'error';
    reason?: string;
  }>;
}> {
  console.log('[CRON EMAIL] ========== Processing First Message Emails ==========');
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[CRON EMAIL] ❌ ERROR: Supabase admin client not available');
    return {
      candidates: 0,
      sent: 0,
      skipped: 0,
      errors: 1,
      details: [],
    };
  }
  
  // 檢查環境變數
  const enabled = process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS === 'true';
  if (!enabled) {
    console.log('[CRON EMAIL] ⏭️  SKIPPED: ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"');
    return {
      candidates: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };
  }
  
  let candidates = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{
    messageId: string;
    receiverEmail: string;
    status: 'sent' | 'skipped' | 'error';
    reason?: string;
  }> = [];
  
  try {
    // 🆕 掃描所有第一則訊息（email_notified_at IS NULL 且 message_type = 'FIRST_MESSAGE'）
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        message_type,
        conversations!inner(
          id,
          user1_id,
          user2_id,
          first_message_email_sent_at
        )
      `)
      .eq('message_type', 'FIRST_MESSAGE')
      .is('email_notified_at', null)
      .order('created_at', { ascending: true })
      .limit(100); // 限制每次處理 100 筆
    
    if (messagesError) {
      console.error('[CRON EMAIL] ❌ ERROR: Failed to fetch messages:', messagesError.message);
      return {
        candidates: 0,
        sent: 0,
        skipped: 0,
        errors: 1,
        details: [],
      };
    }
    
    if (!messages || messages.length === 0) {
      console.log('[CRON EMAIL] ℹ️  No candidate messages found');
      return {
        candidates: 0,
        sent: 0,
        skipped: 0,
        errors: 0,
        details: [],
      };
    }
    
    candidates = messages.length;
    console.log('[CRON EMAIL] Found', candidates, 'candidate messages');
    
    // 處理每則訊息
    for (const message of messages) {
      const messageId = message.id;
      const conversation = message.conversations as any;
      
      // 確定接收者
      const receiverId = conversation.user1_id === message.sender_id
        ? conversation.user2_id
        : conversation.user1_id;
      
      // 檢查是否已經發送過（使用 conversations.first_message_email_sent_at）
      if (conversation.first_message_email_sent_at) {
        console.log('[CRON EMAIL] ⏭️  SKIPPED: Message', messageId, '- Email already sent at', conversation.first_message_email_sent_at);
        skipped++;
        details.push({
          messageId,
          receiverEmail: 'N/A',
          status: 'skipped',
          reason: 'Email already sent',
        });
        continue;
      }
      
      // 取得接收者 Email 和名稱
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('email, notify_msg_new_thread_email, name')
        .eq('id', receiverId)
        .single();
      
      if (!receiverProfile?.email) {
        console.log('[CRON EMAIL] ⏭️  SKIPPED: Message', messageId, '- Receiver has no email');
        skipped++;
        details.push({
          messageId,
          receiverEmail: 'N/A',
          status: 'skipped',
          reason: 'Receiver has no email',
        });
        continue;
      }
      
      const receiverEmail = receiverProfile.email;
      
      // 檢查接收者是否開啟新對話通知
      if (receiverProfile.notify_msg_new_thread_email === false) {
        console.log('[CRON EMAIL] ⏭️  SKIPPED: Message', messageId, '- Receiver disabled new thread notifications');
        skipped++;
        details.push({
          messageId,
          receiverEmail,
          status: 'skipped',
          reason: 'Receiver disabled notifications',
        });
        continue;
      }
      
      // 取得發送者名稱
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', message.sender_id)
        .single();
      
      const senderName = senderProfile?.name || '用戶';
      const receiverName = receiverProfile?.name || '用戶';
      
      // 準備 Email 內容
      const conversationUrl = `${getSiteUrl()}/chat?conversation=${conversation.id}`;
      const messageSnippet = message.content.length > 80
        ? message.content.substring(0, 77) + '...'
        : message.content;
      
      const { html, text, subject } = newMessageEmail({
        recipientName: receiverName,
        senderName,
        messageSnippet,
        conversationId: conversation.id,
        messageType: 'FIRST_MESSAGE',
      });
      
      // 🆕 先標記為已發送（使用 transaction 確保原子性）
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ first_message_email_sent_at: new Date().toISOString() })
        .eq('id', conversation.id)
        .is('first_message_email_sent_at', null);
      
      if (updateError) {
        console.error('[CRON EMAIL] ⚠️  WARNING: Failed to update first_message_email_sent_at for conversation', conversation.id, ':', updateError.message);
      }
      
      // 發送 Email
      try {
        const result = await sendEmail({
          to: receiverEmail,
          subject,
          html,
          text,
          category: 'message_digest',
          dedupeKey: `msg_first:${conversation.id}:${messageId}`,
          userId: receiverId,
        });
        
        if (result.success) {
          // 更新 messages.email_notified_at
          await supabase
            .from('messages')
            .update({ email_notified_at: new Date().toISOString() })
            .eq('id', messageId);
          
          sent++;
          console.log('[CRON EMAIL] ✅ SENT: Message', messageId, 'to', receiverEmail, '- Resend ID:', result.messageId);
          details.push({
            messageId,
            receiverEmail,
            status: 'sent',
          });
        } else {
          errors++;
          // 回滾 first_message_email_sent_at
          await supabase
            .from('conversations')
            .update({ first_message_email_sent_at: null })
            .eq('id', conversation.id);
          
          console.error('[CRON EMAIL] ❌ FAILED: Message', messageId, 'to', receiverEmail, '- Error:', result.error);
          details.push({
            messageId,
            receiverEmail,
            status: 'error',
            reason: result.error,
          });
        }
      } catch (error: any) {
        errors++;
        // 回滾 first_message_email_sent_at
        await supabase
          .from('conversations')
          .update({ first_message_email_sent_at: null })
          .eq('id', conversation.id);
        
        console.error('[CRON EMAIL] ❌ EXCEPTION: Message', messageId, 'to', receiverEmail);
        console.error('[CRON EMAIL] Error:', error.message);
        console.error('[CRON EMAIL] Stack:', error.stack);
        details.push({
          messageId,
          receiverEmail,
          status: 'error',
          reason: error.message,
        });
      }
    }
    
    console.log('[CRON EMAIL] ========== Summary ==========');
    console.log('[CRON EMAIL] Candidates:', candidates);
    console.log('[CRON EMAIL] Sent:', sent);
    console.log('[CRON EMAIL] Skipped:', skipped);
    console.log('[CRON EMAIL] Errors:', errors);
    console.log('[CRON EMAIL] ========================================');
    
    return {
      candidates,
      sent,
      skipped,
      errors,
      details,
    };
    
  } catch (error: any) {
    console.error('[CRON EMAIL] ❌ FATAL ERROR:', error.message);
    console.error('[CRON EMAIL] Stack:', error.stack);
    return {
      candidates,
      sent,
      skipped,
      errors: errors + 1,
      details,
    };
  }
}

export async function GET(request: NextRequest) {
  // 🆕 A) 最外層 log（第一行）
  console.log('[CRON EMAIL] hit', new Date().toISOString());
  
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[CRON EMAIL] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 🆕 B) 強制測試模式
  const { searchParams } = new URL(request.url);
  const forceTest = searchParams.get('forceTest') === '1';
  
  if (forceTest) {
    // 使用環境變數中的測試 email，或預設值
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    console.log('[CRON EMAIL] ========== FORCE TEST MODE ENABLED ==========');
    console.log('[CRON EMAIL] Test email:', testEmail);
    
    const result = await sendTestEmail(testEmail);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mode: 'forceTest',
      testEmail,
      ...result,
    });
  }
  
  // C) 正常處理第一則私訊 Email
  const result = await processFirstMessageEmails();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    mode: 'normal',
    ...result,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

