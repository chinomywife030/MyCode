/**
 * 📧 API Route: 發送訊息摘要 Email
 * POST /api/email/send-message-digest
 * 
 * 這個 API 可由 cron job 或 webhook 呼叫
 * 聚合未讀訊息，避免每則訊息都發送 Email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessageDigestEmail, getTimeBucket } from '@/lib/email';

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 最小間隔：15 分鐘
const DIGEST_INTERVAL_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, conversationId, senderName, contextTitle, unreadCount } = body;

    // 可以直接指定參數，或由系統掃描 queue
    if (userId && conversationId) {
      // 單一發送模式
      return await sendSingleDigest({
        userId,
        conversationId,
        senderName,
        contextTitle,
        unreadCount: unreadCount || 1,
      });
    } else {
      // 批次掃描模式（由 cron 呼叫）
      return await processPendingDigests();
    }
  } catch (error: any) {
    console.error('[Message Digest API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process message digest',
    });
  }
}

/**
 * 發送單一訊息摘要
 */
async function sendSingleDigest(params: {
  userId: string;
  conversationId: string;
  senderName: string;
  contextTitle?: string;
  unreadCount: number;
}) {
  const { userId, conversationId, senderName, contextTitle, unreadCount } = params;
  const supabase = getSupabaseAdmin();

  // 檢查用戶設定
  const { data: canSend } = await supabase.rpc('check_email_preference', {
    p_user_id: userId,
    p_category: 'message_digest',
  });

  if (canSend === false) {
    return NextResponse.json({ success: true, skipped: true, reason: 'User disabled message digest' });
  }

  // 獲取用戶資料
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    return NextResponse.json({ success: true, skipped: true, reason: 'User has no email' });
  }

  const timeBucket = getTimeBucket();

  const result = await sendMessageDigestEmail({
    recipientEmail: profile.email,
    recipientId: userId,
    recipientName: profile.name || '',
    senderName: senderName || '用戶',
    conversationId,
    unreadCount,
    contextTitle,
    timeBucket,
  });

  return NextResponse.json(result);
}

/**
 * 批次處理待發送的訊息摘要
 * 掃描 message_digest_queue，找出需要發送的項目
 */
async function processPendingDigests() {
  const supabase = getSupabaseAdmin();
  
  const cutoffTime = new Date(Date.now() - DIGEST_INTERVAL_MINUTES * 60 * 1000).toISOString();

  // 找出需要發送的項目：
  // 1. digest_sent_at 為 null（從未發送過）
  // 2. 或 digest_sent_at 超過 15 分鐘前
  // 3. 且 first_message_at 超過 10 分鐘（給用戶一些時間自己上線看）
  const { data: pendingItems, error } = await supabase
    .from('message_digest_queue')
    .select(`
      id,
      user_id,
      conversation_id,
      unread_count,
      last_sender_name,
      first_message_at
    `)
    .or(`digest_sent_at.is.null,digest_sent_at.lt.${cutoffTime}`)
    .lt('first_message_at', cutoffTime)
    .limit(50);

  if (error) {
    console.error('[Message Digest] Failed to fetch pending items:', error);
    return NextResponse.json({ success: false, error: error.message });
  }

  if (!pendingItems || pendingItems.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      // 檢查用戶設定
      const { data: canSend } = await supabase.rpc('check_email_preference', {
        p_user_id: item.user_id,
        p_category: 'message_digest',
      });

      if (canSend === false) {
        // 標記為已處理（跳過）
        await supabase
          .from('message_digest_queue')
          .update({ digest_sent_at: new Date().toISOString() })
          .eq('id', item.id);
        continue;
      }

      // 獲取用戶資料
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', item.user_id)
        .single();

      if (!profile?.email) {
        await supabase
          .from('message_digest_queue')
          .update({ digest_sent_at: new Date().toISOString() })
          .eq('id', item.id);
        continue;
      }

      // 獲取對話上下文（如果是需求相關）
      let contextTitle: string | undefined;
      const { data: conversation } = await supabase
        .from('conversations')
        .select('source_title')
        .eq('id', item.conversation_id)
        .single();
      
      if (conversation?.source_title) {
        contextTitle = conversation.source_title;
      }

      const timeBucket = getTimeBucket();

      const result = await sendMessageDigestEmail({
        recipientEmail: profile.email,
        recipientId: item.user_id,
        recipientName: profile.name || '',
        senderName: item.last_sender_name || '用戶',
        conversationId: item.conversation_id,
        unreadCount: item.unread_count || 1,
        contextTitle,
        timeBucket,
      });

      if (result.success) {
        // 更新 digest_sent_at
        await supabase
          .from('message_digest_queue')
          .update({ digest_sent_at: new Date().toISOString() })
          .eq('id', item.id);
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error('[Message Digest] Error processing item:', item.id, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    failed,
    total: pendingItems.length,
  });
}

// 也支援 GET 請求（方便 cron 呼叫）
export async function GET(request: NextRequest) {
  // 驗證 cron secret（可選）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return processPendingDigests();
}


