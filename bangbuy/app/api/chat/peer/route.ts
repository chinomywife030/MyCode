/**
 * 📨 取得對話對方資訊 API（Server-Side）
 * 
 * GET /api/chat/peer?conversationId=xxx
 * 
 * 功能：
 * 1. 使用 Service Role Key 繞過 RLS
 * 2. 返回對話中另一方的用戶資訊
 * 
 * Output: { success: boolean, peer?: { id, name, avatar_url }, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Supabase Anon Client（用於驗證 token）
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase Admin Client（使用 Service Role Key 繞過 RLS）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 從 Authorization header 驗證 Bearer token，取得當前用戶 ID
 */
async function getSessionUser(request: NextRequest): Promise<{ id: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.slice(7);
    if (!token) {
      return null;
    }
    
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    
    return { id: user.id };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. 驗證用戶
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登入' },
        { status: 401 }
      );
    }
    const myId = user.id;
    
    // 2. 取得 conversationId
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Missing conversationId' },
        { status: 400 }
      );
    }
    
    // 3. 查詢對話（使用 admin client）
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();
    
    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    // 4. 確認當前用戶是對話參與者
    if (conversation.user1_id !== myId && conversation.user2_id !== myId) {
      return NextResponse.json(
        { success: false, error: 'Not a participant' },
        { status: 403 }
      );
    }
    
    // 5. 取得對方 ID
    const peerId = conversation.user1_id === myId 
      ? conversation.user2_id 
      : conversation.user1_id;
    
    // 6. 查詢對方 profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, display_name, avatar_url')
      .eq('id', peerId)
      .single();
    
    if (profileError || !profile) {
      // 即使沒有 profile，至少返回 ID
      return NextResponse.json({
        success: true,
        peer: {
          id: peerId,
          name: '匿名用戶',
          avatar_url: null,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      peer: {
        id: profile.id,
        name: profile.display_name || profile.name || '匿名用戶',
        avatar_url: profile.avatar_url,
      },
    });
    
  } catch (error: any) {
    console.error('[chat/peer] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



