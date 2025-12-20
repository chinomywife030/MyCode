'use client';

/**
 * 🔐 聊天導航工具
 * 
 * 解決問題：
 * 1. 點擊私訊按鈕後直接導向聊天室頁面
 * 2. 不會因為刷新或重複點擊而新增重複聊天室
 * 3. 使用 get-or-create 確保冪等性
 */

import { supabase } from '@/lib/supabase';
import { safeRpc } from '@/lib/safeCall';

interface StartChatParams {
  targetUserId: string;
  sourceType?: 'wish_request' | 'trip' | 'listing' | 'direct';
  sourceId?: string | null;
  sourceTitle?: string | null;
}

interface StartChatResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

/**
 * 獲取或創建對話，返回 conversation_id
 * 使用 RPC 確保冪等性（不會創建重複聊天室）
 */
export async function getOrCreateConversation(params: StartChatParams): Promise<StartChatResult> {
  const { targetUserId, sourceType = 'direct', sourceId = null, sourceTitle = null } = params;

  try {
    // 1. 驗證參數
    if (!targetUserId || targetUserId === '00000000-0000-0000-0000-000000000000') {
      return { success: false, error: '目標用戶 ID 無效' };
    }

    // 2. 確保用戶已登入
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // 嘗試刷新 session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        return { success: false, error: '請重新登入' };
      }
      // 重新獲取用戶
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (!refreshedUser) {
        return { success: false, error: '請先登入' };
      }
    }

    // 3. 不能和自己聊天
    const currentUserId = user?.id;
    if (currentUserId === targetUserId) {
      return { success: false, error: '無法和自己對話' };
    }

    // 4. 調用 RPC 獲取或創建對話（DB 層保證唯一性）
    const { data, error: rpcError } = await safeRpc<Array<{ conversation_id: string; is_new?: boolean }>>(
      'get_or_create_conversation',
      {
        p_target: targetUserId,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_source_title: sourceTitle,
      }
    );

    if (rpcError) {
      console.error('[getOrCreateConversation] RPC error:', rpcError);
      return { success: false, error: '無法建立對話，請稍後再試' };
    }

    const conversationId = data?.[0]?.conversation_id;
    if (!conversationId) {
      return { success: false, error: '無法建立對話' };
    }

    return { success: true, conversationId };

  } catch (err: any) {
    console.error('[getOrCreateConversation] Exception:', err);
    return { success: false, error: err.message || '發生錯誤' };
  }
}

/**
 * 構建聊天頁面 URL
 */
export function buildChatUrl(conversationId: string): string {
  return `/chat?conversation=${conversationId}`;
}

/**
 * 完整的「開始聊天」流程
 * 1. 獲取或創建對話
 * 2. 返回導航 URL
 */
export async function startChat(params: StartChatParams): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const result = await getOrCreateConversation(params);
  
  if (!result.success || !result.conversationId) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    url: buildChatUrl(result.conversationId),
  };
}



