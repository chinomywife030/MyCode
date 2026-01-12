import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendToUser } from '@/src/server/push/sendToUser';
import { buildNotificationContent } from '@/lib/notificationContent';

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
 * 建立 wish reply 並發送推播通知給 wish owner
 * 
 * POST /api/replies/create
 * Body: { wishId: string, message: string, userId?: string }
 */
export async function POST(request: NextRequest) {
  console.log('[POST /api/replies/create] Request received');
  
  try {
    const body = await request.json();
    const { wishId, message, userId } = body;
    
    console.log('[POST /api/replies/create] Body:', { wishId, messageLength: message?.length, userId });

    // 驗證輸入
    if (!wishId || !message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數：wishId, message' },
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

    // 1. 查詢 wish 資訊（獲取 owner/buyer_id）
    const { data: wish, error: wishError } = await supabase
      .from('wish_requests')
      .select('id, buyer_id, title')
      .eq('id', wishId)
      .single();

    if (wishError || !wish) {
      console.error('[POST /api/replies/create] Wish not found:', wishError);
      return NextResponse.json(
        { success: false, error: '找不到該願望單' },
        { status: 404 }
      );
    }

    // 2. 建立 reply
    const { data: reply, error: insertError } = await supabase
      .from('wish_replies')
      .insert([
        {
          wish_id: wishId,
          user_id: userId || null, // 允許匿名（userId 可為 null）
          message: message.trim(),
        },
      ])
      .select()
      .single();

    if (insertError || !reply) {
      console.error('[POST /api/replies/create] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: `建立回覆失敗：${insertError?.message || '未知錯誤'}` },
        { status: 500 }
      );
    }

    console.log(`[POST /api/replies/create] Reply created: ${reply.id}`);

    // 3. 發送推播通知並寫入 in-app notification 給 wish owner（如果 owner 存在且不是回覆者本人）
    if (wish.buyer_id && wish.buyer_id !== userId) {
      try {
        // 查詢回覆者名稱（用於通知文案）
        let senderName: string | undefined;
        if (userId) {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();
          senderName = senderProfile?.name;
        }

        // 組裝通知內容
        const notificationContent = buildNotificationContent({
          type: 'wish_quote',
          senderName: senderName,
          wishTitle: wish.title || undefined,
        });

        const notificationTitle = notificationContent.title;
        const pushBody = notificationContent.body;
        const notificationData = {
          type: 'wish_quote', // 使用 wish_quote 以符合強制推播白名單
          wishId: wishId,
          url: `/wish/${wishId}`,
        };

        // 3a. 寫入 in-app notification
        try {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert([
              {
                user_id: wish.buyer_id,
                type: 'wish_quote', // 使用 wish_quote 以符合強制推播白名單
                title: notificationTitle,
                body: pushBody,
                data: notificationData,
                is_read: false,
                dedupe_key: `wish_quote_${wishId}_${reply.id}`, // 防止重複通知
              },
            ]);

          if (notifError) {
            console.error('[POST /api/replies/create] Failed to create notification:', notifError);
            // 通知寫入失敗不影響推播，繼續執行
          } else {
            console.log(`[POST /api/replies/create] In-app notification created for user ${wish.buyer_id}`);
          }
        } catch (notifError: any) {
          console.error('[POST /api/replies/create] Notification insert exception:', notifError);
          // 通知寫入失敗不影響推播，繼續執行
        }

        // 3b. 發送推播通知
        const pushResult = await sendToUser(wish.buyer_id, {
          title: notificationTitle,
          body: pushBody,
          data: notificationData,
        });

        if (pushResult.success) {
          console.log(`[POST /api/replies/create] Push sent to ${wish.buyer_id}: ${pushResult.sent} devices (tokens found: ${pushResult.tokensFound}, tokens used: ${pushResult.tokensUsed})`);
        } else {
          console.warn(`[POST /api/replies/create] Push failed for user ${wish.buyer_id}: ${pushResult.errors} errors. Tokens found: ${pushResult.tokensFound}, tokens used: ${pushResult.tokensUsed}`);
          if (pushResult.tokensFound === 0) {
            console.warn(`[POST /api/replies/create] ⚠️ No device tokens found for user ${wish.buyer_id}. User may not have registered push token.`);
          }
          // 推播失敗不影響回覆建立，只記錄警告
        }
      } catch (pushError: any) {
        console.error('[POST /api/replies/create] Push error:', pushError);
        // 推播失敗不影響回覆建立，只記錄錯誤
      }
    } else {
      console.log('[POST /api/replies/create] Skipping push: owner not found or same user');
    }

    // 4. 返回成功結果
    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        wish_id: reply.wish_id,
        user_id: reply.user_id,
        message: reply.message,
        created_at: reply.created_at,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/replies/create] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || '建立回覆失敗' },
      { status: 500 }
    );
  }
}

