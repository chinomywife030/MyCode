/**
 * 📨 建立/取得直接對話 API（Server-Side）
 * 
 * POST /api/chat/get-or-create-direct
 * 
 * 功能：
 * 1. 使用 Service Role Key 繞過 RLS
 * 2. 確保 User A + User B 永遠只有一個 conversation
 * 3. Server 端負責管理 participants（client 不再寫入 conversation_participants）
 * 
 * Input: { otherUserId: string }
 * Output: { success: boolean, conversationId: string, isNew?: boolean, error?: string }
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
      console.log('[chat/get-or-create] No Authorization header');
      return null;
    }
    
    const token = authHeader.slice(7);
    if (!token) {
      console.log('[chat/get-or-create] Empty token');
      return null;
    }
    
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) {
      console.error('[chat/get-or-create] Token validation failed:', error?.message);
      return null;
    }
    
    return { id: user.id };
  } catch (error) {
    console.error('[chat/get-or-create] Session validation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('[chat/get-or-create] ========================================');
  console.log('[chat/get-or-create] POST /api/chat/get-or-create-direct');
  
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
    
    // 2. 解析請求
    const body = await request.json();
    const { otherUserId } = body;
    
    if (!otherUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing otherUserId' },
        { status: 400 }
      );
    }
    
    if (otherUserId === myId) {
      return NextResponse.json(
        { success: false, error: '無法與自己建立對話' },
        { status: 400 }
      );
    }
    
    console.log('[chat/get-or-create] myId:', myId);
    console.log('[chat/get-or-create] otherUserId:', otherUserId);
    
    // 3. 計算 canonical user pair（確保 deterministic）
    const userLow = myId < otherUserId ? myId : otherUserId;
    const userHigh = myId < otherUserId ? otherUserId : myId;
    
    console.log('[chat/get-or-create] userLow:', userLow);
    console.log('[chat/get-or-create] userHigh:', userHigh);
    
    // 4. 方法一：直接查 conversations 表（使用 user1_id/user2_id 或 user_low_id/user_high_id）
    // 查找現有對話：同時包含這兩個用戶的
    const { data: existingConvs, error: findError } = await supabaseAdmin
      .from('conversations')
      .select('id, created_at')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${myId})`)
      .order('created_at', { ascending: true }) // 選擇最早的（canonical）
      .limit(1);
    
    if (findError) {
      console.error('[chat/get-or-create] Find error:', findError);
      return NextResponse.json(
        { success: false, error: findError.message },
        { status: 500 }
      );
    }
    
    // 5. 如果找到現有對話，返回
    if (existingConvs && existingConvs.length > 0) {
      const canonicalConv = existingConvs[0];
      console.log('[chat/get-or-create] Found existing conversation:', canonicalConv.id);
      return NextResponse.json({
        success: true,
        conversationId: canonicalConv.id,
        isNew: false,
      });
    }
    
    // 6. 找不到，建立新對話（使用 admin client）
    console.log('[chat/get-or-create] Creating new conversation...');
    
    const { data: newConv, error: insertError } = await supabaseAdmin
      .from('conversations')
      .insert({
        user1_id: userLow,    // 使用正規化順序
        user2_id: userHigh,   // 使用正規化順序
        user_low_id: userLow,
        user_high_id: userHigh,
        source_type: 'direct',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (insertError) {
      // 如果是唯一約束衝突（race condition），重新查詢
      if (insertError.code === '23505') {
        console.log('[chat/get-or-create] Conflict (race condition), re-fetching...');
        const { data: refetchedConvs } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${myId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${myId})`)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (refetchedConvs && refetchedConvs.length > 0) {
          return NextResponse.json({
            success: true,
            conversationId: refetchedConvs[0].id,
            isNew: false,
          });
        }
      }
      
      console.error('[chat/get-or-create] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }
    
    if (!newConv?.id) {
      return NextResponse.json(
        { success: false, error: '建立對話失敗：未返回對話 ID' },
        { status: 500 }
      );
    }
    
    console.log('[chat/get-or-create] Created new conversation:', newConv.id);
    console.log('[chat/get-or-create] ========================================');
    
    return NextResponse.json({
      success: true,
      conversationId: newConv.id,
      isNew: true,
    });
    
  } catch (error: any) {
    console.error('[chat/get-or-create] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



