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
      .from('user_push_tokens')
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
    const { conversationId, messageId, senderId } = body;

    // 驗證輸入
    if (!conversationId || !messageId || !senderId) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數：conversationId, messageId, senderId' },
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

    // 1. 查詢訊息內容
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('content, sender_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('[POST /api/push/send-message] Message query error:', messageError);
      return NextResponse.json(
        { success: false, error: `查詢訊息失敗：${messageError?.message || '訊息不存在'}` },
        { status: 404 }
      );
    }

    // 2. 查詢對話對方 user_id（排除 senderId）
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('[POST /api/push/send-message] Conversation query error:', convError);
      return NextResponse.json(
        { success: false, error: `查詢對話失敗：${convError?.message || '對話不存在'}` },
        { status: 404 }
      );
    }

    // 確定接收者 ID（排除發送者）
    const recipientId = conversation.user1_id === senderId 
      ? conversation.user2_id 
      : conversation.user1_id;

    if (!recipientId) {
      console.error('[POST /api/push/send-message] No recipient found');
      return NextResponse.json(
        { success: false, error: '找不到接收者' },
        { status: 404 }
      );
    }

    // 避免 self-notification
    if (recipientId === senderId) {
      console.log('[POST /api/push/send-message] Skipping self-notification');
      return NextResponse.json({ success: true, sent: 0, skipped: 'self-notification' });
    }

    // 3. 查詢發送者名稱
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.name || '有人';

    // 4. 查詢接收者的所有 push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', recipientId);

    if (tokensError) {
      console.error('[POST /api/push/send-message] Tokens query error:', tokensError);
      return NextResponse.json(
        { success: false, error: `查詢 tokens 失敗：${tokensError.message}` },
        { status: 500 }
      );
    }

    // 如果沒有 token，直接略過，不報錯
    if (!tokens || tokens.length === 0) {
      console.log(`[POST /api/push/send-message] No tokens found for recipient: ${recipientId}`);
      return NextResponse.json({ success: true, sent: 0, skipped: 'no-tokens' });
    }

    // 提取所有 token
    const pushTokens = tokens.map((t) => t.expo_push_token).filter(Boolean);

    if (pushTokens.length === 0) {
      console.log(`[POST /api/push/send-message] No valid push tokens for recipient: ${recipientId}`);
      return NextResponse.json({ success: true, sent: 0, skipped: 'no-valid-tokens' });
    }

    // 5. 準備推播內容
    const title = 'BangBuy';
    const pushBody = `${senderName}: ${message.content.substring(0, 40)}${message.content.length > 40 ? '...' : ''}`;
    const data = { conversationId };

    console.log(`[POST /api/push/send-message] Sending to ${pushTokens.length} tokens for recipient: ${recipientId}`);

    // 6. 發送推播
    const pushResult = await sendExpoPushNotification(pushTokens, title, pushBody, data);

    // 7. 處理無效 token
    if (pushResult.errors && pushResult.errors.length > 0) {
      const invalidTokens = pushResult.errors
        .filter((e: any) => {
          // Expo 會返回 DeviceNotRegistered 等錯誤，表示 token 無效
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
      console.warn(`[POST /api/push/send-message] Push errors:`, pushResult.errors);
    }

    return NextResponse.json({
      success: pushResult.success,
      sent: pushResult.results?.length || 0,
      errors: pushResult.errors?.length || 0,
      tokensFound: tokens.length,
      tokensUsed: pushTokens.length,
    });
  } catch (error: any) {
    console.error('[POST /api/push/send-message] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || '發送推播失敗' },
      { status: 500 }
    );
  }
}


