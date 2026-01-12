'use server';

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// ============================================
// 🔐 安全初始化 Resend（可選功能）
// ============================================

/**
 * 安全獲取 Resend 實例
 * - 如果沒有設定 API key，返回 null 並顯示警告
 * - Email 功能變成「可選增強」，不會影響其他功能
 */
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY not set. Email features are disabled.');
    return null;
  }

  return new Resend(apiKey);
}

// ============================================
// 🔐 安全初始化 Supabase Admin
// ============================================

/**
 * 安全獲取 Supabase Admin Client
 * - 如果沒有設定環境變數，返回 null
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  return createClient(url, key);
}

// ============================================
// 📧 Email 通知功能（Best-Effort，不中斷主流程）
// ============================================

/**
 * 發送報價通知郵件
 * @description 當代購對願望單報價時，通知買家
 * @note Email 是可選功能，失敗不會影響主流程
 */
export async function sendOfferNotification(wishTitle: string, buyerId: string, price: number) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.log('[sendOfferNotification] Supabase Admin not available, skipping email');
      return;
    }

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(buyerId);
    if (!user?.email) {
      console.log('[sendOfferNotification] User has no email, skipping');
      return;
    }

    // 🔐 安全獲取 Resend（可選功能）
    const resend = getResend();
    if (!resend) {
      console.log('[sendOfferNotification] Email disabled (no API key), skipping email notification');
      return;
    }

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] 你收到新的報價：${wishTitle}`,
      html: `
        <h1>有代購想接單</h1>
        <p>你的需求 <strong>${wishTitle}</strong> 收到新的報價。</p>
        <p><strong>報價金額：</strong> $${price}</p>
        <p>前往 BangBuy 查看詳細內容。</p>
        <a href="https://bangbuy.vercel.app/dashboard" style="background:#2563EB;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">查看訂單</a>
      `,
    });
    console.log('✅ [sendOfferNotification] 報價通知已寄出');
  } catch (error) {
    // 🔐 Email 失敗不中斷主流程，只記錄警告
    console.warn('[sendOfferNotification] Email failed (non-critical):', error);
  }
}

/**
 * 發送訊息通知郵件
 * @description 當用戶收到新訊息時，發送 email 通知
 * @note Email 是可選功能，失敗不會影響主流程
 */
// ============================================
// 🔐 聊天室管理（防止重複創建）
// ============================================

/**
 * 正規化 user pair（確保 user_low < user_high）
 * 避免 A/B 與 B/A 被視為不同對話
 */
function normalizeUserPair(userId1: string, userId2: string): { userLow: string; userHigh: string } {
  if (userId1 < userId2) {
    return { userLow: userId1, userHigh: userId2 };
  }
  return { userLow: userId2, userHigh: userId1 };
}

/**
 * 生成 source_key（避免 NULL 造成 UNIQUE 失效）
 */
function generateSourceKey(sourceType: string, sourceId: string | null): string {
  if (sourceType === 'direct') return 'direct';
  if (sourceType === 'legacy') return 'legacy';
  if (sourceId) return sourceId;
  return sourceType; // fallback
}

/**
 * 獲取或創建聊天室（單一入口，防止重複）
 * 
 * @description 
 * - 先查詢是否存在，找到就返回
 * - 找不到才創建，遇到 conflict 時再查一次
 * - 確保同一組 (user_low, user_high, source_type, source_key) 只有一筆
 */
export async function getOrCreateConversation(params: {
  currentUserId: string;
  targetUserId: string;
  sourceType: 'wish_request' | 'trip' | 'listing' | 'direct' | 'legacy';
  sourceId: string | null;
  sourceTitle: string | null;
}): Promise<{ success: boolean; conversationId: string | null; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { success: false, conversationId: null, error: 'Database not configured' };
    }

    const { currentUserId, targetUserId, sourceType, sourceId, sourceTitle } = params;

    // Step A：參數標準化
    const { userLow, userHigh } = normalizeUserPair(currentUserId, targetUserId);
    const sourceKey = generateSourceKey(sourceType, sourceId);

    console.log('[getOrCreateConversation] Params:', {
      userLow, userHigh, sourceType, sourceKey
    });

    // Step B：先查詢是否存在
    // 使用正規化後的 user pair 查詢
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${userLow},user2_id.eq.${userHigh}),and(user1_id.eq.${userHigh},user2_id.eq.${userLow})`)
      .eq('source_type', sourceType)
      .eq('source_key', sourceKey)
      .maybeSingle();

    if (selectError) {
      console.error('[getOrCreateConversation] Select error:', selectError);
      // 如果是因為欄位不存在（source_key），嘗試舊版查詢
      const { data: existingOld } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${userLow},user2_id.eq.${userHigh}),and(user1_id.eq.${userHigh},user2_id.eq.${userLow})`)
        .eq('source_type', sourceType)
        .maybeSingle();
      
      if (existingOld) {
        console.log('[getOrCreateConversation] Found existing (old schema):', existingOld.id);
        return { success: true, conversationId: existingOld.id };
      }
    }

    if (existing) {
      console.log('[getOrCreateConversation] Found existing:', existing.id);
      return { success: true, conversationId: existing.id };
    }

    // Step C：找不到才插入
    console.log('[getOrCreateConversation] Creating new conversation');
    
    const insertData: Record<string, unknown> = {
      user1_id: userLow,  // 正規化：較小的 UUID
      user2_id: userHigh, // 正規化：較大的 UUID
      source_type: sourceType,
      source_id: sourceId,
      source_title: sourceTitle,
      source_key: sourceKey,
    };

    const { data: newConv, error: insertError } = await supabaseAdmin
      .from('conversations')
      .insert([insertData])
      .select('id')
      .single();

    if (insertError) {
      // 遇到 unique conflict 時，再查一次（race condition 處理）
      if (insertError.code === '23505') {
        console.log('[getOrCreateConversation] Conflict, re-querying...');
        const { data: conflictConv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${userLow},user2_id.eq.${userHigh}),and(user1_id.eq.${userHigh},user2_id.eq.${userLow})`)
          .eq('source_type', sourceType)
          .maybeSingle();
        
        if (conflictConv) {
          return { success: true, conversationId: conflictConv.id };
        }
      }
      
      // 如果是因為 source_key 欄位不存在，嘗試舊版插入
      if (insertError.message?.includes('source_key')) {
        console.log('[getOrCreateConversation] Trying insert without source_key');
        const { data: newConvOld, error: insertErrorOld } = await supabaseAdmin
          .from('conversations')
          .insert([{
            user1_id: userLow,
            user2_id: userHigh,
            source_type: sourceType,
            source_id: sourceId,
            source_title: sourceTitle,
          }])
          .select('id')
          .single();
        
        if (newConvOld) {
          return { success: true, conversationId: newConvOld.id };
        }
        
        if (insertErrorOld?.code === '23505') {
          // Race condition, query again
          const { data: raceConv } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .or(`and(user1_id.eq.${userLow},user2_id.eq.${userHigh}),and(user1_id.eq.${userHigh},user2_id.eq.${userLow})`)
            .eq('source_type', sourceType)
            .maybeSingle();
          
          if (raceConv) {
            return { success: true, conversationId: raceConv.id };
          }
        }
      }
      
      console.error('[getOrCreateConversation] Insert error:', insertError);
      return { success: false, conversationId: null, error: insertError.message };
    }

    console.log('[getOrCreateConversation] Created new:', newConv.id);
    return { success: true, conversationId: newConv.id };

  } catch (error: any) {
    console.error('[getOrCreateConversation] Unexpected error:', error);
    return { success: false, conversationId: null, error: error.message };
  }
}

/**
 * 檢查封鎖狀態（安全版本，不會 403）
 * 
 * @description 
 * - 使用 admin client 繞過 RLS
 * - 返回 boolean 結果，不會因權限問題失敗
 */
export async function checkBlockStatusSafe(userId1: string, userId2: string): Promise<{
  isBlocked: boolean;
  blockedByUser1: boolean;
  blockedByUser2: boolean;
}> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      // 沒有 admin client，預設為未封鎖
      return { isBlocked: false, blockedByUser1: false, blockedByUser2: false };
    }

    const { data: blocks, error } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`);

    if (error) {
      console.warn('[checkBlockStatusSafe] Query error (treating as not blocked):', error);
      return { isBlocked: false, blockedByUser1: false, blockedByUser2: false };
    }

    if (!blocks || blocks.length === 0) {
      return { isBlocked: false, blockedByUser1: false, blockedByUser2: false };
    }

    const blockedByUser1 = blocks.some(b => b.blocker_id === userId1);
    const blockedByUser2 = blocks.some(b => b.blocker_id === userId2);

    return {
      isBlocked: blockedByUser1 || blockedByUser2,
      blockedByUser1,
      blockedByUser2,
    };
  } catch (error) {
    console.warn('[checkBlockStatusSafe] Unexpected error (treating as not blocked):', error);
    return { isBlocked: false, blockedByUser1: false, blockedByUser2: false };
  }
}

export async function sendMessageNotification(receiverId: string, senderName: string, content: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.log('[sendMessageNotification] Supabase Admin not available, skipping email');
      return;
    }

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(receiverId);
    if (!user?.email) {
      console.log('[sendMessageNotification] User has no email, skipping');
      return;
    }

    // 🔐 安全獲取 Resend（可選功能）
    const resend = getResend();
    if (!resend) {
      console.log('[sendMessageNotification] Email disabled (no API key), skipping email notification');
      return;
    }

    await resend.emails.send({
      from: 'BangBuy <onboarding@resend.dev>',
      to: user.email,
      subject: `[BangBuy] ${senderName} 傳送了一則新訊息`,
      html: `
        <p><strong>${senderName}</strong> 傳來新訊息：</p>
        <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #555;">${content}</blockquote>
        <br />
        <a href="https://bangbuy.vercel.app/chat" style="color:#2563EB;">立即前往查看</a>
      `,
    });
    console.log('✅ [sendMessageNotification] 訊息通知已寄出');
  } catch (error) {
    // 🔐 Email 失敗不中斷主流程，只記錄警告
    console.warn('[sendMessageNotification] Email failed (non-critical):', error);
  }
}
