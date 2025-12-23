/**
 * 🔔 私訊 Email 通知 API
 * 
 * POST /api/notifications/message
 * 當新訊息插入時，由 trigger 或前端呼叫此 API 發送通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleMessageNotification, MessageNotificationPayload } from '@/lib/messageNotifications';
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
    
    // 建立 payload
    const payload: MessageNotificationPayload = {
      messageId,
      conversationId,
      senderId,
      content: content || '',
      messageType: messageType || 'REPLY_MESSAGE',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    
    // 處理通知
    const result = await handleMessageNotification(payload);
    
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

