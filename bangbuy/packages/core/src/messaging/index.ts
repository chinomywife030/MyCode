/**
 * @bangbuy/core - Messaging (私訊) 模組
 * 
 * 提供對話和訊息相關的操作
 */

import { getSupabaseClient, getApiBaseUrl, getAuthToken } from '../client';
import type {
  Conversation,
  Message,
  SendMessageParams,
  SendMessageResult,
  GetOrCreateConversationParams,
  GetOrCreateConversationResult,
} from '../types';

// ============================================
// 讀取操作（使用 Supabase RPC）
// ============================================

/**
 * 獲取對話列表
 */
export async function getConversations(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  const { limit = 30 } = options || {};

  try {
    // 先嘗試無參數版本（最安全）
    let data, error;
    try {
      const result = await supabase.rpc('get_conversation_list');
      data = result.data;
      error = result.error;
    } catch (e: any) {
      // 如果無參數版本失敗，嘗試有參數版本（按照函數定義的順序）
      try {
        const result = await supabase.rpc('get_conversation_list', {
          p_limit: limit,
          p_before: null,
        });
        data = result.data;
        error = result.error;
      } catch (e2: any) {
        // 如果還失敗，嘗試相反的參數順序（某些 Supabase 版本可能有這個問題）
        const result = await supabase.rpc('get_conversation_list', {
          p_before: null,
          p_limit: limit,
        });
        data = result.data;
        error = result.error;
      }
    }

    if (error) {
      console.error('[core/getConversations] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    // 獲取其他用戶的 profile 資訊（如果需要）
    const otherUserIds = [...new Set((data || []).map((item: any) => item.other_user_id).filter(Boolean))];
    const profilesMap = new Map();
    
    if (otherUserIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', otherUserIds);
        
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, { name: p.name, avatar_url: p.avatar_url });
          });
        }
      } catch (profileError) {
        console.warn('[core/getConversations] Failed to fetch profiles:', profileError);
      }
    }

    return (data || []).map((item: any) => {
      const profile = profilesMap.get(item.other_user_id);
      return {
        id: item.id,
        otherUserId: item.other_user_id,
        otherUserName: profile?.name || item.other_user_name || '匿名用戶',
        otherUserAvatar: profile?.avatar_url || item.other_user_avatar || undefined,
        sourceType: item.source_type || undefined,
        sourceId: item.source_id || undefined,
        sourceTitle: item.source_title || undefined,
        lastMessageAt: item.last_message_at || undefined,
        lastMessagePreview: item.last_message_preview || undefined,
        unreadCount: Number(item.unread_count) || 0,
        isBlocked: item.is_blocked || false,
        createdAt: item.created_at,
      };
    });
  } catch (error) {
    console.error('[core/getConversations] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

/**
 * 獲取對話的訊息列表
 */
export async function getMessages(
  conversationId: string,
  options?: {
    limit?: number;
    before?: string; // ISO datetime for pagination (目前 RPC 不支持)
  }
): Promise<Message[]> {
  const supabase = getSupabaseClient();

  try {
    // 目前 RPC 只接受 conversation_id，不支持 limit/before
    const { data, error } = await supabase.rpc('get_messages', {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error('[core/getMessages] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    // 獲取發送者的 profile 資訊
    const senderIds = [...new Set((data || []).map((item: any) => item.sender_id).filter(Boolean))];
    const profilesMap = new Map();
    
    if (senderIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', senderIds);
        
        if (profiles) {
          profiles.forEach((p: any) => {
            profilesMap.set(p.id, { name: p.name, avatar_url: p.avatar_url });
          });
        }
      } catch (profileError) {
        console.warn('[core/getMessages] Failed to fetch profiles:', profileError);
      }
    }

    // RPC 返回的是升序排列（根據 migration-messages-rpc.sql）
    const messages = (data || []).map((item: any) => {
      const profile = profilesMap.get(item.sender_id);
      return {
        id: item.id,
        conversationId: conversationId,
        senderId: item.sender_id,
        senderName: profile?.name || item.sender_name || '匿名用戶',
        senderAvatar: profile?.avatar_url || item.sender_avatar || undefined,
        content: item.content,
        clientMessageId: item.client_message_id || undefined,
        status: item.status || 'sent',
        createdAt: item.created_at,
      };
    });

    return messages; // 已經是升序
  } catch (error) {
    console.error('[core/getMessages] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

// ============================================
// 寫入操作（使用 Supabase RPC）
// ============================================

/**
 * 發送訊息
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const supabase = getSupabaseClient();
  const { conversationId, content } = params;

  // 獲取當前用戶 ID（必須）
  let currentUserId: string | null = null;
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[core/sendMessage] Failed to get current user:', {
        message: authError.message,
        code: authError.code,
        status: (authError as any).status,
        error: authError,
      });
      return { success: false, error: '未登入，無法發送訊息' };
    }
    currentUserId = user?.id || null;
    if (!currentUserId) {
      console.error('[core/sendMessage] Current user ID is null');
      return { success: false, error: '無法取得用戶 ID' };
    }
    console.log('[core/sendMessage] Current user ID:', currentUserId);
  } catch (authError: any) {
    console.error('[core/sendMessage] Exception getting current user:', {
      message: authError.message,
      stack: authError.stack,
      error: authError,
    });
    return { success: false, error: '無法取得用戶資訊' };
  }

  // 驗證必要參數
  if (!conversationId) {
    console.error('[core/sendMessage] conversationId is missing');
    return { success: false, error: '對話 ID 不能為空' };
  }
  if (!content || !content.trim()) {
    console.error('[core/sendMessage] content is empty');
    return { success: false, error: '訊息內容不能為空' };
  }

  // 準備 insert payload（只包含必要欄位）
  const insertPayload = {
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: content.trim(),
  };
  console.log('[core/sendMessage] Insert payload:', JSON.stringify(insertPayload, null, 2));

  try {
    // 直接 insert（不使用 upsert/onConflict）
    const { data: insertedData, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    // 完整印出錯誤
    if (insertError) {
      console.error('[core/sendMessage] Insert Error (完整):', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        error: insertError,
        payload: insertPayload,
      });
      return { success: false, error: insertError.message || '發送失敗' };
    }

    if (!insertedData) {
      console.error('[core/sendMessage] Insert succeeded but no data returned');
      return { success: false, error: '發送失敗：未返回訊息資料' };
    }

    console.log('[core/sendMessage] Insert success, message:', JSON.stringify(insertedData, null, 2));

    // 更新 conversations.last_message_at 和 last_message_preview
    try {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.trim().substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('[core/sendMessage] Failed to update conversation:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          error: updateError,
        });
        // 不影響返回結果，訊息已成功插入
      }
    } catch (updateError: any) {
      console.error('[core/sendMessage] Exception updating conversation:', {
        message: updateError.message,
        stack: updateError.stack,
        error: updateError,
      });
      // 不影響返回結果，訊息已成功插入
    }

    // 觸發推播通知（非阻塞，失敗不影響訊息發送）
    try {
      const apiBaseUrl = getApiBaseUrl();
      if (apiBaseUrl) {
        // 查詢接收者 user_id（排除發送者）
        const { data: conversation } = await supabase
          .from('conversations')
          .select('user1_id, user2_id')
          .eq('id', conversationId)
          .single();

        if (conversation) {
          const recipientId = conversation.user1_id === currentUserId 
            ? conversation.user2_id 
            : conversation.user1_id;

          // 避免 self-notification
          if (recipientId && recipientId !== currentUserId) {
            // 查詢發送者名稱
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', currentUserId)
              .single();

            const senderName = senderProfile?.name || '有人';

            // 非阻塞發送，不等待結果
            fetch(`${apiBaseUrl}/api/push/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: recipientId,
                title: 'BangBuy',
                body: `${senderName}: ${content.trim().substring(0, 40)}${content.trim().length > 40 ? '...' : ''}`,
                data: {
                  type: 'chat_message',
                  chatId: conversationId,
                },
              }),
            }).catch((pushError) => {
              // 靜默處理錯誤，不影響訊息發送
              console.warn('[core/sendMessage] Push notification failed (non-critical):', pushError);
            });
          }
        }
      } else {
        console.warn('[core/sendMessage] API base URL not configured, skipping push notification');
      }
    } catch (pushError: any) {
      // 靜默處理錯誤，不影響訊息發送
      console.warn('[core/sendMessage] Push notification exception (non-critical):', pushError);
    }

    return {
      success: true,
      messageId: insertedData.id,
    };
  } catch (error: any) {
    // 完整印出錯誤
    console.error('[core/sendMessage] Exception (完整):', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      error: error,
      payload: insertPayload,
    });
    return { success: false, error: error.message || '發送失敗：發生未知錯誤' };
  }
}

/**
 * 取得或建立對話
 * 
 * 嚴格的「一對一」規則：
 * - 只使用 User A + User B 作為唯一鍵
 * - 不使用 sourceType/sourceId 創建獨立聊天室
 * - 同兩個用戶之間永遠只有一個對話
 */
export async function getOrCreateConversation(
  params: GetOrCreateConversationParams
): Promise<GetOrCreateConversationResult> {
  const supabase = getSupabaseClient();
  const { targetUserId, sourceType = 'direct', sourceId, sourceTitle } = params;

  // 1. 獲取當前用戶
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[core/getOrCreateConversation] Auth error:', authError);
    return { success: false, error: '未登入，無法建立對話' };
  }
  const currentUserId = user.id;

  // 2. 驗證
  if (!targetUserId) {
    return { success: false, error: '目標用戶 ID 不能為空' };
  }
  if (targetUserId === currentUserId) {
    return { success: false, error: '無法與自己建立對話' };
  }

  // 3. 計算穩定的 user pair（確保順序一致）
  const lowId = currentUserId < targetUserId ? currentUserId : targetUserId;
  const highId = currentUserId < targetUserId ? targetUserId : currentUserId;

  try {
    // 4. 查找現有對話（只看 user pair，忽略 source_type/source_id）
    const { data: existingConv, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('[core/getOrCreateConversation] Find error:', findError);
      // 不拋錯，繼續嘗試創建
    }

    // 5. 如果找到現有對話，直接返回
    if (existingConv?.id) {
      console.log('[core/getOrCreateConversation] Found existing conversation:', existingConv.id);
      return {
        success: true,
        conversationId: existingConv.id,
        isNew: false,
      };
    }

    // 6. 創建新對話
    console.log('[core/getOrCreateConversation] Creating new conversation...');
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user1_id: currentUserId,
        user2_id: targetUserId,
        user_low_id: lowId,
        user_high_id: highId,
        source_type: sourceType || 'direct',
        source_id: sourceId || null,
        source_title: sourceTitle || null,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // 如果是唯一約束衝突（對話已存在），重新查詢
      if (insertError.code === '23505') {
        console.log('[core/getOrCreateConversation] Conflict, re-fetching...');
        const { data: refetchedConv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
          .limit(1)
          .single();

        if (refetchedConv?.id) {
          return {
            success: true,
            conversationId: refetchedConv.id,
            isNew: false,
          };
        }
      }
      
      console.error('[core/getOrCreateConversation] Insert error:', insertError);
      return { success: false, error: insertError.message || '建立對話失敗' };
    }

    if (!newConv?.id) {
      return { success: false, error: '建立對話失敗：未返回對話 ID' };
    }

    console.log('[core/getOrCreateConversation] Created new conversation:', newConv.id);
    return {
      success: true,
      conversationId: newConv.id,
      isNew: true,
    };
  } catch (error: any) {
    console.error('[core/getOrCreateConversation] Exception:', error);
    return { success: false, error: error.message || '建立對話失敗：發生未知錯誤' };
  }
}

/**
 * 標記對話為已讀
 */
export async function markAsRead(conversationId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc('mark_as_read', {
      p_conversation_id: conversationId,
    });

    if (error) {
      console.error('[core/markAsRead] Error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[core/markAsRead] Exception:', error);
    return false;
  }
}

/**
 * 封鎖用戶
 */
export async function blockUser(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc('block_user', {
      p_user_id: userId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('[core/blockUser] Error:', error);
      return { success: false, error: error.message || '封鎖失敗' };
    }

    return { success: data === true };
  } catch (error: any) {
    console.error('[core/blockUser] Exception:', error);
    return { success: false, error: error.message || '封鎖失敗：發生未知錯誤' };
  }
}

/**
 * 解除封鎖用戶
 */
export async function unblockUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.rpc('unblock_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[core/unblockUser] Error:', error);
      return { success: false, error: error.message || '解除封鎖失敗' };
    }

    return { success: data === true };
  } catch (error: any) {
    console.error('[core/unblockUser] Exception:', error);
    return { success: false, error: error.message || '解除封鎖失敗：發生未知錯誤' };
  }
}

