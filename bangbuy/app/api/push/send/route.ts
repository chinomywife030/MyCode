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
      .in('expo_push_token', invalidTokens);

    if (error) {
      console.error('[removeInvalidTokens] Error:', error);
    } else {
      console.log(`[removeInvalidTokens] Removed ${invalidTokens.length} invalid tokens`);
    }
  } catch (error) {
    console.error('[removeInvalidTokens] Exception:', error);
  }
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

    // 查詢該用戶的所有 push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', user_id);

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
    const pushTokens = tokens.map((t) => t.expo_push_token).filter(Boolean);

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


