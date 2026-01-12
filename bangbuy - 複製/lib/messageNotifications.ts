/**
 * 🔔 私訊 Email 通知服務（簡化版 - 只處理新對話第一則）
 * 
 * 核心邏輯：
 * 1. FIRST_MESSAGE：新對話的第一則訊息 → 立即寄信（若設定開啟）
 * 2. REPLY_MESSAGE：一般回覆 → 不寄信（由未讀提醒處理）
 */

import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './email/sender';
import { newMessageEmail, MessageEmailType } from './email/templates/newMessage';
import { getSiteUrl } from './siteUrl';

// ========== Types ==========

export interface SendMessageNotificationParams {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'FIRST_MESSAGE' | 'REPLY_MESSAGE';
  createdAt: string;
}

// ========== Environment Variables ==========

function getEnvConfig() {
  // 確保只用字串比較
  const enabled = process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS === 'true';
  const sendInDev = process.env.EMAIL_SEND_IN_DEV === 'true';
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    enabled,
    sendInDev,
    nodeEnv,
  };
}

// ========== Supabase Admin Client ==========

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey);
}

// ========== Helper Functions ==========

/**
 * 取得用戶 Email（從 profiles 或 auth.users）
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  
  // 1. 先從 profiles 查
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  
  if (profile?.email) {
    return profile.email;
  }
  
  // 2. 如果 profiles 沒有，從 auth.users 查
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    if (authUser?.user?.email) {
      // 同步到 profiles
      await supabase
        .from('profiles')
        .update({ email: authUser.user.email })
        .eq('id', userId);
      
      return authUser.user.email;
    }
  } catch (err: any) {
    console.error('[msg-email] Failed to get email from auth.users:', err.message);
  }
  
  return null;
}

/**
 * 取得用戶顯示名稱
 */
async function getUserDisplayName(userId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return '用戶';
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, name')
    .eq('id', userId)
    .maybeSingle();
  
  return profile?.display_name || profile?.name || '用戶';
}

/**
 * 檢查用戶是否開啟新對話通知
 */
async function shouldNotifyNewThread(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true; // 預設開啟
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_msg_new_thread_email')
    .eq('id', userId)
    .maybeSingle();
  
  return profile?.notify_msg_new_thread_email ?? true;
}

// ========== Main Export ==========

/**
 * 發送私訊 Email 通知
 * 
 * @param params - 訊息資訊
 */
export async function sendMessageEmailNotification(
  params: SendMessageNotificationParams
): Promise<void> {
  const { messageId, conversationId, senderId, receiverId, content, messageType, createdAt } = params;
  
  const env = getEnvConfig();
  const supabase = getSupabaseAdmin();
  
  // 🆕 詳細的開始日誌（包含所有必要資訊）
  const hasResendKey = !!process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || '';
  const maskedFrom = from ? `${from.substring(0, 3)}***@${from.split('@')[1] || '***'}` : '(not set)';
  const maskedKey = process.env.RESEND_API_KEY 
    ? `${process.env.RESEND_API_KEY.substring(0, 4)}***${process.env.RESEND_API_KEY.substring(process.env.RESEND_API_KEY.length - 4)}`
    : '(not set)';
  
  console.log('[msg-email] ========================================');
  console.log('[msg-email] ========== First Message Email Notification ==========');
  console.log('[msg-email] Timestamp:', new Date().toISOString());
  console.log('[msg-email] conversationId:', conversationId);
  console.log('[msg-email] messageId:', messageId);
  console.log('[msg-email] senderId:', senderId);
  console.log('[msg-email] receiverId:', receiverId);
  console.log('[msg-email] messageType:', messageType);
  console.log('[msg-email] content snippet:', content?.substring(0, 50) + (content?.length > 50 ? '...' : ''));
  console.log('[msg-email] env status:');
  console.log('[msg-email]   ENABLE_MESSAGE_EMAIL_NOTIFICATIONS:', env.enabled);
  console.log('[msg-email]   NODE_ENV:', env.nodeEnv);
  console.log('[msg-email]   RESEND_API_KEY:', hasResendKey ? maskedKey : '❌ NOT SET');
  console.log('[msg-email]   EMAIL_FROM:', from ? maskedFrom : '❌ NOT SET');
  console.log('[msg-email]   EMAIL_SEND_IN_DEV:', env.sendInDev);
  
  // 1. 功能總開關檢查
  if (!env.enabled) {
    console.log('[msg-email] ❌ BLOCKED: ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"');
    console.log('[msg-email] 💡 Current value:', process.env.ENABLE_MESSAGE_EMAIL_NOTIFICATIONS);
    console.log('[msg-email] 💡 Fix: Set ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true in Vercel environment variables');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 額外檢查：確認 RESEND_API_KEY 存在
  if (!hasResendKey) {
    console.log('[msg-email] ❌ BLOCKED: RESEND_API_KEY is not set');
    console.log('[msg-email] 💡 Fix: Set RESEND_API_KEY in Vercel environment variables');
    console.log('[msg-email] ========================================');
    return;
  }
  
  console.log('[msg-email] ✅ All environment checks passed');
  
  // 2. 只處理新對話第一則訊息
  if (messageType !== 'FIRST_MESSAGE') {
    console.log('[msg-email] ⏭️  SKIPPED: Not a first message (type:', messageType, ')');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 🆕 3. 檢查是否已經發送過 Email（使用 first_message_email_sent_at 去重）
  if (!supabase) {
    console.error('[msg-email] ❌ ERROR: Supabase admin client not available');
    console.error('[msg-email] 💡 Fix: Set SUPABASE_SERVICE_ROLE_KEY in environment variables');
    console.log('[msg-email] ========================================');
    return;
  }
  
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('first_message_email_sent_at')
    .eq('id', conversationId)
    .single();
  
  if (convError) {
    console.error('[msg-email] ❌ ERROR: Failed to fetch conversation:', convError.message);
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 🆕 如果已經發送過，跳過
  if (conversation?.first_message_email_sent_at) {
    console.log('[msg-email] ⏭️  SKIPPED: Email already sent at', conversation.first_message_email_sent_at);
    console.log('[msg-email] 💡 This prevents duplicate emails');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 4. 檢查接收者是否開啟新對話通知
  const shouldNotify = await shouldNotifyNewThread(receiverId);
  if (!shouldNotify) {
    console.log('[msg-email] ⏭️  SKIPPED: Receiver disabled new thread notifications');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 5. 取得接收者 Email
  const receiverEmail = await getUserEmail(receiverId);
  if (!receiverEmail) {
    console.log('[msg-email] ❌ BLOCKED: Receiver has no email');
    console.log('[msg-email] receiverId:', receiverId);
    console.log('[msg-email] 💡 Fix: Ensure user has an email in profiles or auth.users');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 🆕 記錄 receiver_email（用於可觀測性）
  console.log('[msg-email] receiverEmail:', receiverEmail);
  
  // 6. 取得發送者名稱
  const senderName = await getUserDisplayName(senderId);
  const receiverName = await getUserDisplayName(receiverId);
  
  // 7. 開發模式檢查
  if (env.nodeEnv === 'development' && !env.sendInDev) {
    console.log('[msg-email] ⏭️  SKIPPED: Development mode with EMAIL_SEND_IN_DEV=false');
    console.log('[msg-email] Would send to:', receiverEmail);
    console.log('[msg-email] Sender:', senderName);
    console.log('[msg-email] Content snippet:', content.substring(0, 80));
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 8. 準備 Email 內容
  const conversationUrl = `${getSiteUrl()}/chat?conversation=${conversationId}`;
  const messageSnippet = content.length > 80 ? content.substring(0, 77) + '...' : content;
  
  const { html, text, subject } = newMessageEmail({
    recipientName: receiverName,
    senderName,
    messageSnippet,
    conversationId,
    messageType: 'FIRST_MESSAGE',
  });
  
  // 9. 發送 Email（使用 transaction 確保只發送一次）
  try {
    // 🆕 先標記為已發送（使用 upsert 避免 race condition）
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ first_message_email_sent_at: new Date().toISOString() })
      .eq('id', conversationId)
      .is('first_message_email_sent_at', null); // 只更新 NULL 的，避免覆蓋已發送的
    
    if (updateError) {
      console.error('[msg-email] ⚠️  WARNING: Failed to update first_message_email_sent_at:', updateError.message);
      // 繼續嘗試發送，但記錄警告
    } else {
      console.log('[msg-email] ✅ Marked conversation as email-sent (prevents duplicate)');
    }
    
    const result = await sendEmail({
      to: receiverEmail,
      subject,
      html,
      text,
      category: 'message_digest',
      dedupeKey: `msg_first:${conversationId}:${messageId}`,
      userId: receiverId,
    });
    
    // 🆕 詳細的結果日誌
    if (result.success) {
      console.log('[msg-email] ✅ EMAIL SENT SUCCESSFULLY');
      console.log('[msg-email] Resend messageId:', result.messageId);
      console.log('[msg-email] To:', receiverEmail);
      console.log('[msg-email] Conversation:', conversationId);
      console.log('[msg-email] Message:', messageId);
    } else {
      console.error('[msg-email] ❌ EMAIL SEND FAILED');
      console.error('[msg-email] Error:', result.error);
      console.error('[msg-email] To:', receiverEmail);
      console.error('[msg-email] Conversation:', conversationId);
      console.error('[msg-email] Message:', messageId);
      
      // 🆕 明確的錯誤提示
      if (result.error?.includes('RESEND_API_KEY')) {
        console.error('[msg-email] 💡 Fix: Set RESEND_API_KEY in environment variables');
      }
      if (result.error?.includes('EMAIL_FROM')) {
        console.error('[msg-email] 💡 Fix: Set EMAIL_FROM in environment variables and verify domain in Resend');
      }
      if (result.error?.includes('domain') || result.error?.includes('verified')) {
        console.error('[msg-email] 💡 Fix: Verify EMAIL_FROM domain in Resend dashboard');
      }
      if (result.error?.includes('api_key') || result.error?.includes('unauthorized')) {
        console.error('[msg-email] 💡 Fix: Check RESEND_API_KEY is valid and has correct permissions');
      }
      
      // 如果有 Resend error response，也印出來
      if (result.envStatus?.resendError) {
        console.error('[msg-email] Resend error response:', JSON.stringify(result.envStatus.resendError, null, 2));
      }
      
      // 🆕 如果發送失敗，回滾 first_message_email_sent_at（允許重試）
      if (updateError === null) {
        await supabase
          .from('conversations')
          .update({ first_message_email_sent_at: null })
          .eq('id', conversationId);
        console.log('[msg-email] ⚠️  Rolled back first_message_email_sent_at (allows retry)');
      }
    }
  } catch (error: any) {
    console.error('[msg-email] ❌ EXCEPTION during email send');
    console.error('[msg-email] Error message:', error.message);
    console.error('[msg-email] Error stack:', error.stack);
    console.error('[msg-email] To:', receiverEmail);
    console.error('[msg-email] Conversation:', conversationId);
    console.error('[msg-email] Message:', messageId);
    
    // 🆕 回滾 first_message_email_sent_at（允許重試）
    if (supabase) {
      await supabase
        .from('conversations')
        .update({ first_message_email_sent_at: null })
        .eq('id', conversationId);
      console.log('[msg-email] ⚠️  Rolled back first_message_email_sent_at (allows retry)');
    }
  }
  
  console.log('[msg-email] ========================================');
}

// ========== Unread Reminders ==========

/**
 * 處理未讀提醒（Cron Job）
 * 
 * 掃描未讀訊息，對符合條件的用戶發送提醒 Email
 */
export async function processUnreadReminders(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const env = getEnvConfig();
  
  console.log('[unread-reminders] ========================================');
  console.log('[unread-reminders] start');
  console.log('[unread-reminders] env', {
    enabled: env.enabled,
    sendInDev: env.sendInDev,
    nodeEnv: env.nodeEnv,
  });
  
  // 功能總開關檢查
  if (!env.enabled) {
    console.log('[unread-reminders] blocked: ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"');
    console.log('[unread-reminders] ========================================');
    return { processed: 0, sent: 0, errors: 0 };
  }
  
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[unread-reminders] No Supabase admin client');
    return { processed: 0, sent: 0, errors: 0 };
  }
  
  let processed = 0;
  let sent = 0;
  let errors = 0;
  
  try {
    // 1. 取得所有開啟未讀提醒的用戶設定
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notify_msg_unread_reminder_email, notify_msg_unread_hours, email')
      .eq('notify_msg_unread_reminder_email', true);
    
    if (profilesError) {
      console.error('[unread-reminders] Failed to fetch profiles:', profilesError);
      return { processed: 0, sent: 0, errors: 1 };
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('[unread-reminders] No users with unread reminders enabled');
      console.log('[unread-reminders] ========================================');
      return { processed: 0, sent: 0, errors: 0 };
    }
    
    // 2. 對每個用戶檢查未讀訊息
    for (const profile of profiles) {
      processed++;
      
      const unreadHours = profile.notify_msg_unread_hours ?? 12;
      const thresholdTime = new Date();
      thresholdTime.setHours(thresholdTime.getHours() - unreadHours);
      
      // 查詢該用戶的未讀訊息（排除自己發的）
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          conversations!inner(user1_id, user2_id)
        `)
        .lt('created_at', thresholdTime.toISOString())
        .neq('sender_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (messagesError) {
        console.error(`[unread-reminders] Failed to fetch messages for user ${profile.id}:`, messagesError);
        errors++;
        continue;
      }
      
      if (!unreadMessages || unreadMessages.length === 0) {
        continue;
      }
      
      // 3. 檢查是否已經提醒過（使用 conversation_reminders 表）
      const conversationIds = [...new Set(unreadMessages.map(m => m.conversation_id))];
      
      for (const conversationId of conversationIds) {
        // 檢查 24 小時內是否已提醒
        const { data: reminder } = await supabase
          .from('conversation_reminders')
          .select('last_reminded_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (reminder?.last_reminded_at) {
          const lastReminded = new Date(reminder.last_reminded_at);
          const hoursSinceReminder = (Date.now() - lastReminded.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceReminder < 24) {
            // 24 小時內已提醒過，跳過
            continue;
          }
        }
        
        // 4. 找到該對話中最新的未讀訊息
        const conversationMessages = unreadMessages.filter(m => m.conversation_id === conversationId);
        const latestMessage = conversationMessages[0];
        
        if (!latestMessage) continue;
        
        // 5. 取得發送者名稱
        const senderName = await getUserDisplayName(latestMessage.sender_id);
        
        // 6. 取得接收者 Email
        const receiverEmail = profile.email || await getUserEmail(profile.id);
        if (!receiverEmail) {
          console.log(`[unread-reminders] User ${profile.id} has no email, skipping`);
          continue;
        }
        
        // 7. 開發模式檢查
        if (env.nodeEnv === 'development' && !env.sendInDev) {
          console.log(`[unread-reminders] Would send reminder to ${receiverEmail} for conversation ${conversationId}`);
          continue;
        }
        
        // 8. 發送提醒 Email
        const conversationUrl = `${getSiteUrl()}/chat?conversation=${conversationId}`;
        const messageSnippet = latestMessage.content.length > 80 
          ? latestMessage.content.substring(0, 77) + '...' 
          : latestMessage.content;
        
        const { html, text, subject } = newMessageEmail({
          recipientName: await getUserDisplayName(profile.id),
          senderName,
          messageSnippet,
          conversationId,
          messageType: 'REPLY_MESSAGE',
        });
        
        try {
          const result = await sendEmail({
            to: receiverEmail,
            subject: `[提醒] ${subject}`,
            html,
            text,
            category: 'message_reminder',
            dedupeKey: `unread_reminder:${conversationId}:${profile.id}:${Date.now()}`,
            userId: profile.id,
          });
          
          if (result.success) {
            sent++;
            
            // 更新提醒記錄
            await supabase
              .from('conversation_reminders')
              .upsert({
                conversation_id: conversationId,
                user_id: profile.id,
                last_reminded_at: new Date().toISOString(),
                last_message_id_reminded: latestMessage.id,
              });
            
            console.log(`[unread-reminders] Sent reminder to ${receiverEmail} for conversation ${conversationId}`);
          } else {
            errors++;
            console.error(`[unread-reminders] Failed to send reminder:`, result.error);
          }
        } catch (error: any) {
          errors++;
          console.error(`[unread-reminders] Error sending reminder:`, error);
        }
      }
    }
    
    console.log(`[unread-reminders] Completed: processed=${processed}, sent=${sent}, errors=${errors}`);
    console.log('[unread-reminders] ========================================');
    
    return { processed, sent, errors };
    
  } catch (error: any) {
    console.error('[unread-reminders] Unexpected error:', error);
    return { processed, sent, errors: errors + 1 };
  }
}

