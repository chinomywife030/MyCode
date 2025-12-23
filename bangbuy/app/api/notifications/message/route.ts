/**
 * 🔔 私訊 Email 通知 API
 * 
 * POST /api/notifications/message
 * 當新訊息插入時，由 trigger 或前端呼叫此 API 發送通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMessageEmailNotification, SendMessageNotificationParams } from '@/lib/messageNotifications';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    return null;
  }
  
  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/notifications/message');
  
  try {
    const body = await request.json();
    
    // 驗證必要欄位
    const { messageId, conversationId, senderId, content, messageType } = body;
    
    if (!messageId || !conversationId || !senderId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, conversationId, senderId' },
        { status: 400 }
      );
    }
    
    // 取得 conversation 以確定 receiverId
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      console.error('[API] Conversation not found:', convError);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // 確定接收者
    const receiverId = conversation.user1_id === senderId 
      ? conversation.user2_id 
      : conversation.user1_id;
    
    // 建立 payload
    const params: SendMessageNotificationParams = {
      messageId,
      conversationId,
      senderId,
      receiverId,
      content: content || '',
      messageType: (messageType || 'REPLY_MESSAGE') as 'FIRST_MESSAGE' | 'REPLY_MESSAGE',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    
    // 發送通知（非阻塞）
    sendMessageEmailNotification(params).catch(err => {
      console.error('[API] Email notification failed (non-blocking):', err);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Notification queued',
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/message/process-reminders
 * 處理未讀提醒（由 cron job 呼叫）
 */
export async function GET(request: NextRequest) {
  console.log('[API] GET /api/notifications/message (process reminders)');
  
  // 簡單的 API Key 驗證（用於 cron job）
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { processUnreadReminders } = await import('@/lib/messageNotifications');
    const result = await processUnreadReminders();
    
    return NextResponse.json({
      success: true,
      ...result,
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

