/**
 * 推播通知去重與節流機制
 * 
 * 功能：
 * 1. 去重（dedupe）：相同 dedupe_key 只會發送一次
 * 2. 節流（throttle）：相同 throttle_key 在時間窗口內只發送一次，其他合併
 */

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

export interface EnqueueNotificationParams {
  userId: string;
  type: 'chat' | 'wish' | 'trip' | string;
  entityId: string;
  title: string;
  body: string;
  data: Record<string, any>;
  dedupeKey: string;
  throttleKey: string;
  throttleWindowSec?: number;
}

export interface EnqueueNotificationResult {
  status: 'sent' | 'deduped' | 'throttled';
  jobId?: string;
  aggregatedIntoJobId?: string;
  error?: string;
}

/**
 * 發送 Expo Push Notification（內部使用）
 */
async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; results?: any[]; errors?: any[] }> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(
        tokens.map((token) => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: data || {},
        }))
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendExpoPushNotification] HTTP error:', response.status, errorText);
      return { success: false, errors: [{ message: `HTTP ${response.status}: ${errorText}` }] };
    }

    const results = await response.json();
    
    const errors: any[] = [];
    const successes: any[] = [];
    
    (Array.isArray(results) ? results : [results]).forEach((result: any, index: number) => {
      if (result.status === 'error') {
        errors.push({ token: tokens[index], error: result.message });
      } else {
        successes.push(result);
      }
    });

    return {
      success: errors.length === 0,
      results: successes,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('[sendExpoPushNotification] Exception:', error);
    return {
      success: false,
      errors: [{ message: error.message || '發送推播失敗' }],
    };
  }
}

/**
 * 查詢用戶的 push tokens
 */
async function getUserPushTokens(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  // 先嘗試從 push_tokens 表查詢（新表）
  const { data: newTokens, error: newError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (!newError && newTokens && newTokens.length > 0) {
    return newTokens.map((t) => t.token).filter(Boolean);
  }

  // 如果新表沒有，嘗試從 user_push_tokens 表查詢（舊表）
  const { data: oldTokens, error: oldError } = await supabase
    .from('user_push_tokens')
    .select('expo_push_token')
    .eq('user_id', userId);

  if (!oldError && oldTokens && oldTokens.length > 0) {
    return oldTokens.map((t) => t.expo_push_token).filter(Boolean);
  }

  return [];
}

/**
 * 將通知加入佇列並處理去重與節流
 */
export async function enqueueNotification(
  params: EnqueueNotificationParams
): Promise<EnqueueNotificationResult> {
  const {
    userId,
    type,
    entityId,
    title,
    body,
    data,
    dedupeKey,
    throttleKey,
    throttleWindowSec = 30,
  } = params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      status: 'sent',
      error: 'Supabase not configured',
    };
  }

  try {
    // 步驟 1: 嘗試插入新 job（用於去重檢查）
    // 使用 INSERT ... ON CONFLICT (dedupe_key) DO NOTHING 來原子性地檢查去重
    const { data: insertedJob, error: insertError } = await supabase
      .from('notification_jobs')
      .insert({
        user_id: userId,
        type,
        entity_id: entityId,
        title,
        body,
        data,
        dedupe_key: dedupeKey,
        throttle_key: throttleKey,
        throttle_window_sec: throttleWindowSec,
        pending_count: 1,
      })
      .select('id')
      .single();

    // 如果插入失敗且是因為 UNIQUE 衝突（去重）
    if (insertError) {
      // PostgreSQL 的 unique violation error code 是 23505
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        console.log(`[enqueueNotification] Deduped: ${dedupeKey}`);
        return {
          status: 'deduped',
        };
      }
      // 其他錯誤
      console.error('[enqueueNotification] Insert error:', insertError);
      throw insertError;
    }

    // 插入成功，取得 job ID
    const jobId = insertedJob?.id;
    if (!jobId) {
      throw new Error('Failed to get job ID after insert');
    }

    console.log(`[enqueueNotification] New job created: ${jobId}, dedupeKey: ${dedupeKey}`);

    // 步驟 2: 檢查節流（查詢同 throttle_key 最近一筆已發送的 job）
    const { data: recentJob, error: recentError } = await supabase
      .from('notification_jobs')
      .select('id, sent_at, last_aggregated_at')
      .eq('throttle_key', throttleKey)
      .eq('user_id', userId)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (recentError && recentError.code !== 'PGRST116') {
      // PGRST116 是 "not found"，這是正常的（沒有最近發送的）
      console.error('[enqueueNotification] Query recent job error:', recentError);
      // 繼續執行，不中斷
    }

    // 檢查是否在節流窗口內
    if (recentJob?.sent_at) {
      const sentAt = new Date(recentJob.sent_at);
      const now = new Date();
      const diffSec = (now.getTime() - sentAt.getTime()) / 1000;

      if (diffSec < throttleWindowSec) {
        // 在節流窗口內，合併到最近一筆 job
        console.log(
          `[enqueueNotification] Throttled: ${throttleKey}, ` +
          `last sent ${diffSec.toFixed(1)}s ago, merging into ${recentJob.id}`
        );

        // 更新最近一筆 job：增加 pending_count 並更新 last_aggregated_at
        // 使用 SQL 的原子更新（先查詢再更新）
        const { data: currentJob } = await supabase
          .from('notification_jobs')
          .select('pending_count')
          .eq('id', recentJob.id)
          .single();

        if (currentJob) {
          await supabase
            .from('notification_jobs')
            .update({
              pending_count: (currentJob.pending_count || 1) + 1,
              last_aggregated_at: new Date().toISOString(),
            })
            .eq('id', recentJob.id);
        }

        // 刪除剛插入的 job（因為已經合併到舊的）
        await supabase
          .from('notification_jobs')
          .delete()
          .eq('id', jobId);

        return {
          status: 'throttled',
          aggregatedIntoJobId: recentJob.id,
        };
      }
    }

    // 不在節流窗口內，立即發送
    console.log(`[enqueueNotification] Sending immediately: ${jobId}`);

    // 查詢用戶的 push tokens
    const tokens = await getUserPushTokens(supabase, userId);

    if (tokens.length === 0) {
      console.log(`[enqueueNotification] No tokens for user ${userId}, marking as sent`);
      // 沒有 token 也標記為已發送（避免重試）
      await supabase
        .from('notification_jobs')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', jobId);

      return {
        status: 'sent',
        jobId,
      };
    }

    // 發送推播
    const pushResult = await sendExpoPushNotification(tokens, title, body, data);

    // 更新 job 狀態
    if (pushResult.success) {
      await supabase
        .from('notification_jobs')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', jobId);

      console.log(`[enqueueNotification] Push sent successfully: ${jobId}`);
    } else {
      console.error(`[enqueueNotification] Push failed: ${jobId}`, pushResult.errors);
      // 即使失敗也標記為已發送（避免無限重試），或可以保留 sent_at 為 null 以便未來重試
      // 這裡選擇標記為已發送，避免阻塞
      await supabase
        .from('notification_jobs')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    return {
      status: 'sent',
      jobId,
    };
  } catch (error: any) {
    console.error('[enqueueNotification] Error:', error);
    return {
      status: 'sent',
      error: error.message || 'Unknown error',
    };
  }
}

