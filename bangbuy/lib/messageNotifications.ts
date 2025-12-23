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
  
  // 日誌：開始
  console.log('[msg-email] ========================================');
  console.log('[msg-email] start', {
    conversationId,
    senderId,
    receiverId,
    messageType,
  });
  console.log('[msg-email] env', {
    enabled: env.enabled,
    sendInDev: env.sendInDev,
    nodeEnv: env.nodeEnv,
  });
  
  // 1. 功能總開關檢查
  if (!env.enabled) {
    console.log('[msg-email] blocked reason: ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 2. 只處理新對話第一則訊息
  if (messageType !== 'FIRST_MESSAGE') {
    console.log('[msg-email] skipped: Not a first message (type:', messageType, ')');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 3. 檢查接收者是否開啟新對話通知
  const shouldNotify = await shouldNotifyNewThread(receiverId);
  if (!shouldNotify) {
    console.log('[msg-email] blocked reason: Receiver disabled new thread notifications');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 4. 取得接收者 Email
  const receiverEmail = await getUserEmail(receiverId);
  if (!receiverEmail) {
    console.log('[msg-email] blocked reason: Receiver has no email');
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 5. 取得發送者名稱
  const senderName = await getUserDisplayName(senderId);
  const receiverName = await getUserDisplayName(receiverId);
  
  // 6. 開發模式檢查
  if (env.nodeEnv === 'development' && !env.sendInDev) {
    console.log('[msg-email] blocked reason: Development mode with EMAIL_SEND_IN_DEV=false');
    console.log('[msg-email] Would send to:', receiverEmail);
    console.log('[msg-email] Sender:', senderName);
    console.log('[msg-email] Content snippet:', content.substring(0, 80));
    console.log('[msg-email] ========================================');
    return;
  }
  
  // 7. 準備 Email 內容
  const conversationUrl = `${getSiteUrl()}/chat?conversation=${conversationId}`;
  const messageSnippet = content.length > 80 ? content.substring(0, 77) + '...' : content;
  
  const { html, text, subject } = newMessageEmail({
    recipientName: receiverName,
    senderName,
    messageSnippet,
    conversationId,
    messageType: 'FIRST_MESSAGE',
  });
  
  // 8. 發送 Email
  try {
    const result = await sendEmail({
      to: receiverEmail,
      subject,
      html,
      text,
      category: 'message_digest',
      dedupeKey: `msg_first:${conversationId}:${messageId}`,
      userId: receiverId,
    });
    
    if (result.success) {
      console.log('[msg-email] sent', {
        id: result.messageId,
        to: receiverEmail,
      });
    } else {
      console.error('[msg-email] failed', {
        error: result.error,
        to: receiverEmail,
      });
    }
  } catch (error: any) {
    console.error('[msg-email] failed', {
      error: error.message,
      stack: error.stack,
      to: receiverEmail,
    });
  }
  
  console.log('[msg-email] ========================================');
}
