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

/**
 * 發送 Expo Push Notification
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
    
    // Expo API 返回的是陣列，每個元素對應一個 token 的結果
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
 * 處理無效的 token（從資料庫刪除）
 */
async function removeInvalidTokens(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invalidTokens: string[]
): Promise<void> {
  if (!supabase || invalidTokens.length === 0) return;

  try {
    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .in('fcm_token', invalidTokens);

    if (error) {
      console.error('[removeInvalidTokens] Error:', error);
    } else {
      console.log(`[removeInvalidTokens] Removed ${invalidTokens.length} invalid tokens`);
    }
  } catch (error) {
    console.error('[removeInvalidTokens] Exception:', error);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * 強制推播白名單
 * 
 * 這些通知類型屬於高價值交易事件，必須無條件發送 Push Notification，
 * 不受使用者通知偏好影響。
 * 
 * 原因：
 * - wish_quote / new_quote：報價是交易流程的關鍵節點，買家需要即時知道有人報價，
 *   錯過報價可能導致交易機會流失，影響平台交易轉換率。
 */
const FORCE_PUSH_TYPES = ['wish_quote', 'new_quote'];

/**
 * 檢查是否應該發送推播通知
 * 
 * @param notificationType - 通知類型（從 payload.data.type 取得）
 * @param userPreferences - 使用者通知偏好設定
 * @returns 是否應該發送推播
 */
async function shouldSendPush(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  notificationType: string | undefined
): Promise<boolean> {
  // 強制推播白名單：無條件發送
  if (notificationType && FORCE_PUSH_TYPES.includes(notificationType)) {
    console.log(`[shouldSendPush] Force push for type: ${notificationType}`);
    return true;
  }

  // 其他類型：檢查使用者偏好
  // 目前預設為 true（允許推播），未來可根據實際偏好設定調整
  // 例如：查詢 notification_preferences 表，檢查 email_reco_enabled 等
  
  return true;
}

export interface SendToUserResult {
  success: boolean;
  sent: number;
  errors: number;
  tokensFound: number;
  tokensUsed: number;
  details?: {
    results?: any[];
    errors?: any[];
  };
}

/**
 * 發送推播通知給指定用戶
 * 
 * @param userId - 目標用戶 ID
 * @param payload - 推播內容（title, body, data）
 * @returns 發送結果
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload
): Promise<SendToUserResult> {
  try {
    // 獲取 Supabase Admin Client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error('Supabase service role key 未配置');
    }

    // 取得通知類型（從 payload.data.type）
    const notificationType = payload.data?.type;

    // 檢查是否應該發送推播（gating 邏輯）
    const shouldSend = await shouldSendPush(supabase, userId, notificationType);
    if (!shouldSend) {
      console.log(`[sendToUser] Skipping push for user ${userId}, type: ${notificationType}`);
      return {
        success: true,
        sent: 0,
        errors: 0,
        tokensFound: 0,
        tokensUsed: 0,
      };
    }

    // 查詢該用戶的所有有效 device tokens
    const { data: tokens, error: queryError } = await supabase
      .from('device_tokens')
      .select('fcm_token, user_id, device_id')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(10); // 限制最多 10 個裝置

    if (queryError) {
      console.error('[sendToUser] Query error:', queryError);
      throw new Error(`查詢失敗：${queryError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log(`[sendToUser] No tokens found for userId: ${userId}`);
      return {
        success: false,
        sent: 0,
        errors: 0,
        tokensFound: 0,
        tokensUsed: 0,
      };
    }

    // 提取所有 token
    const pushTokens = tokens.map((t) => t.fcm_token).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log(`[sendToUser] No valid push tokens for userId: ${userId}`);
      return {
        success: false,
        sent: 0,
        errors: 0,
        tokensFound: tokens.length,
        tokensUsed: 0,
      };
    }

    console.log(`[sendToUser] Sending to ${pushTokens.length} tokens for userId: ${userId}`);

    // 發送推播
    const pushResult = await sendExpoPushNotification(
      pushTokens,
      payload.title,
      payload.body,
      payload.data
    );

    // 處理無效 token
    if (pushResult.errors && pushResult.errors.length > 0) {
      const invalidTokens = pushResult.errors
        .filter((e: any) => {
          // Expo 會返回 DeviceNotRegistered 等錯誤，表示 token 無效
          const errorMsg = e.error?.toLowerCase() || '';
          return (
            errorMsg.includes('notregistered') ||
            errorMsg.includes('invalid') ||
            errorMsg.includes('expired')
          );
        })
        .map((e: any) => e.token);

      if (invalidTokens.length > 0) {
        await removeInvalidTokens(supabase, invalidTokens);
      }
    }

    return {
      success: pushResult.success,
      sent: pushResult.results?.length || 0,
      errors: pushResult.errors?.length || 0,
      tokensFound: tokens.length,
      tokensUsed: pushTokens.length,
      details: {
        results: pushResult.results,
        errors: pushResult.errors,
      },
    };
  } catch (error: any) {
    console.error('[sendToUser] Exception:', error);
    throw error;
  }
}








