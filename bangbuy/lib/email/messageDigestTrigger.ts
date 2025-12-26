/**
 * 📧 訊息摘要觸發器
 * 當有新訊息時，更新 message_digest_queue
 * 由聊天系統呼叫
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    console.warn('[MessageDigest] No service key, skipping');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 當有新訊息時呼叫此函數
 * 會更新 message_digest_queue，用於後續聚合發送
 */
export async function queueMessageDigest(params: {
  recipientId: string;
  conversationId: string;
  senderName: string;
}): Promise<void> {
  const { recipientId, conversationId, senderName } = params;
  
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    // Upsert: 如果已有記錄則更新，否則新增
    const { error } = await supabase
      .from('message_digest_queue')
      .upsert(
        {
          user_id: recipientId,
          conversation_id: conversationId,
          unread_count: 1,
          last_sender_name: senderName,
          last_message_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,conversation_id',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      // 如果 upsert 失敗，嘗試用 update + insert
      const { data: existing } = await supabase
        .from('message_digest_queue')
        .select('id, unread_count')
        .eq('user_id', recipientId)
        .eq('conversation_id', conversationId)
        .single();

      if (existing) {
        await supabase
          .from('message_digest_queue')
          .update({
            unread_count: (existing.unread_count || 0) + 1,
            last_sender_name: senderName,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('message_digest_queue')
          .insert({
            user_id: recipientId,
            conversation_id: conversationId,
            unread_count: 1,
            last_sender_name: senderName,
            first_message_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          });
      }
    }
  } catch (err) {
    console.error('[MessageDigest] Queue error:', err);
  }
}

/**
 * 當用戶閱讀訊息時呼叫
 * 清除該對話的 digest queue
 */
export async function clearMessageDigest(params: {
  userId: string;
  conversationId: string;
}): Promise<void> {
  const { userId, conversationId } = params;
  
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase
      .from('message_digest_queue')
      .delete()
      .eq('user_id', userId)
      .eq('conversation_id', conversationId);
  } catch (err) {
    console.error('[MessageDigest] Clear error:', err);
  }
}













