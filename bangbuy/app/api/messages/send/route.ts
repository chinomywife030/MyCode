/**
 * 📨 發送私訊 API（Server-Side）
 * 
 * POST /api/messages/send
 * 
 * 功能：
 * 1. 在 server 端插入訊息到資料庫
 * 2. 判斷是否為新對話第一則訊息
 * 3. 發送 Email 通知（若符合條件）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessageEmailNotification } from '@/lib/messageNotifications';

export const runtime = 'nodejs';

// Supabase Anon Client（用於驗證 token）
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase Admin Client（使用 Service Role Key 繞過 RLS，用於資料庫操作）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 從 Authorization header 驗證 Bearer token
async function getSessionUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    const hasAuthHeader = !!authHeader;
    
    console.log('[api-send] hasAuthHeader:', hasAuthHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[api-send] No Authorization header or invalid format');
      return null;
    }
    
    const token = authHeader.slice(7);
    
    if (!token) {
      console.log('[api-send] Empty token');
      return null;
    }
    
    // 使用 anon client 驗證 token
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !user) {
      console.error('[api-send] Token validation failed:', error?.message);
      return null;
    }
    
    console.log('[api-send] userId:', user.id);
    
    return { id: user.id, email: user.email };
  } catch (error) {
    console.error('[api-send] Session validation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('[api-send] ========================================');
  console.log('[api-send] POST /api/messages/send');
  
  try {
    // 1. 驗證用戶（從 Authorization header）
    const user = await getSessionUser(request);
    if (!user) {
      console.error('[api-send] ❌ Unauthorized - no valid token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. 解析請求
    const body = await request.json();
    const { conversationId, content } = body;
    
    if (!conversationId || !content || !content.trim()) {
      console.error('[api-send] ❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, content' },
        { status: 400 }
      );
    }
    
    console.log('[api-send] conversationId:', conversationId);
    console.log('[api-send] senderId:', user.id);
    console.log('[api-send] content length:', content.trim().length);
    
    // 3. 檢查對話是否存在且用戶有權限（使用 admin client）
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      console.error('[api-send] ❌ Conversation not found:', convError?.message);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // 驗證用戶是對話參與者
    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      console.error('[api-send] ❌ User not in conversation');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // 4. 判斷是否為新對話第一則訊息（對接收者而言）
    const receiverId = conversation.user1_id === user.id 
      ? conversation.user2_id 
      : conversation.user1_id;
    
    // 計算接收者已收到的訊息數量（排除接收者自己發的）
    const { count: messageCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', receiverId); // 排除接收者自己發的
    
    const isFirstMessage = (messageCount ?? 0) === 0;
    const messageType = isFirstMessage ? 'FIRST_MESSAGE' : 'REPLY_MESSAGE';
    
    console.log('[api-send] messageCount:', messageCount);
    console.log('[api-send] isFirstMessage:', isFirstMessage);
    console.log('[api-send] messageType:', messageType);
    
    // 5. 插入訊息（使用 admin client）
    const { data: messageData, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: messageType,
      })
      .select('id, created_at')
      .single();
    
    if (insertError) {
      console.error('[msg-send] ❌ Failed to insert message:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', details: insertError.message },
        { status: 500 }
      );
    }
    
    console.log('[api-send] ✅ Message inserted:', messageData.id);
    
    // 6. 更新 conversation 的 last_message_at
    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    // 7. 發送 Email 通知（非阻塞）
    sendMessageEmailNotification({
      messageId: messageData.id,
      conversationId,
      senderId: user.id,
      receiverId,
      content: content.trim(),
      messageType: messageType as 'FIRST_MESSAGE' | 'REPLY_MESSAGE',
      createdAt: messageData.created_at,
    }).catch(err => {
      // Email 失敗不影響訊息發送
      console.error('[api-send] Email notification failed (non-blocking):', err);
    });
    
    console.log('[api-send] ✅ Message sent successfully');
    console.log('[api-send] ========================================');
    
    return NextResponse.json({
      success: true,
      messageId: messageData.id,
      messageType,
      createdAt: messageData.created_at,
    });
    
  } catch (error: any) {
    console.error('[api-send] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

