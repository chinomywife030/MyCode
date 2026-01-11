import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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
      .from('push_tokens')
      .delete()
      .in('token', invalidTokens);

    if (error) {
      console.error('[removeInvalidTokens] Error:', error);
    } else {
      console.log(`[removeInvalidTokens] Removed ${invalidTokens.length} invalid tokens`);
    }
  } catch (error) {
    console.error('[removeInvalidTokens] Exception:', error);
  }
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
 * @param notificationType - 通知類型（從 data.type 取得）
 * @param userPreferences - 使用者通知偏好設定
 * @returns 是否應該發送推播
 */
function shouldSendPush(
  notificationType: string | undefined,
  userPreferences: {
    email_reco_enabled?: boolean;
    [key: string]: any;
  } | null
): boolean {
  // 強制推播白名單：無條件發送
  if (notificationType && FORCE_PUSH_TYPES.includes(notificationType)) {
    console.log(`[shouldSendPush] Force push for type: ${notificationType}`);
    return true;
  }

  // 其他類型：檢查使用者偏好
  // 目前預設為 true（允許推播），未來可根據實際偏好設定調整
  // 例如：if (userPreferences?.email_reco_enabled === false) return false;
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, title, body: messageBody, data } = body;

    // 驗證輸入
    if (!user_id || !title || !messageBody) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數：user_id, title, body' },
        { status: 400 }
      );
    }

    // 獲取 Supabase Admin Client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase service role key 未配置' },
        { status: 500 }
      );
    }

    // 取得通知類型（從 data.type 或 body.type）
    const notificationType = data?.type || body.type;

    // 查詢使用者通知偏好（僅在非強制推播類型時查詢）
    let userPreferences: any = null;
    if (!notificationType || !FORCE_PUSH_TYPES.includes(notificationType)) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_reco_enabled, digest_mode')
        .eq('user_id', user_id)
        .single();
      
      userPreferences = prefs;
    }

    // 檢查是否應該發送推播（gating 邏輯）
    if (!shouldSendPush(notificationType, userPreferences)) {
      console.log(`[POST /api/push/send] Skipping push for user ${user_id}, type: ${notificationType}, preferences:`, userPreferences);
      return NextResponse.json({ 
        success: true, 
        sent: 0, 
        skipped: 'user-preference' 
      });
    }

    // 查詢該用戶的所有 push tokens
    // 優先使用 user_push_tokens（mobile app 使用），如果沒有則回退到 push_tokens
    let tokens: any[] | null = null;
    let tokensError: any = null;
    
    // 先嘗試 user_push_tokens（mobile app）
    const { data: mobileTokens, error: mobileTokensError } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', user_id);
    
    if (!mobileTokensError && mobileTokens && mobileTokens.length > 0) {
      // 轉換格式：expo_push_token -> token
      tokens = mobileTokens.map(t => ({ token: t.expo_push_token }));
    } else {
      // 回退到 push_tokens（web 或其他）
      const { data: webTokens, error: webTokensError } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user_id);
      
      tokens = webTokens;
      tokensError = webTokensError;
    }

    if (tokensError) {
      console.error('[POST /api/push/send] Tokens query error:', tokensError);
      return NextResponse.json(
        { success: false, error: `查詢 tokens 失敗：${tokensError.message}` },
        { status: 500 }
      );
    }

    // 如果沒有 token，直接略過，不報錯
    if (!tokens || tokens.length === 0) {
      console.log(`[POST /api/push/send] No tokens found for user: ${user_id}`);
      return NextResponse.json({ success: true, sent: 0, skipped: 'no-tokens' });
    }

    // 提取所有 token
    const pushTokens = tokens.map((t) => t.token).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log(`[POST /api/push/send] No valid push tokens for user: ${user_id}`);
      return NextResponse.json({ success: true, sent: 0, skipped: 'no-valid-tokens' });
    }

    console.log(`[POST /api/push/send] Sending to ${pushTokens.length} tokens for user: ${user_id}`);

    // 發送推播
    const pushResult = await sendExpoPushNotification(pushTokens, title, messageBody, data);

    // 處理無效 token
    if (pushResult.errors && pushResult.errors.length > 0) {
      const invalidTokens = pushResult.errors
        .filter((e: any) => {
          const errorMsg = (e.error?.toLowerCase() || e.message?.toLowerCase() || '');
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

      // 記錄錯誤（但不影響返回）
      console.warn(`[POST /api/push/send] Push errors:`, pushResult.errors);
    }

    return NextResponse.json({
      success: pushResult.success,
      sent: pushResult.results?.length || 0,
      errors: pushResult.errors?.length || 0,
      tokensFound: tokens.length,
      tokensUsed: pushTokens.length,
    });
  } catch (error: any) {
    console.error('[POST /api/push/send] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || '發送推播失敗' },
      { status: 500 }
    );
  }
}


