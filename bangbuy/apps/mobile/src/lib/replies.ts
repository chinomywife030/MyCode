import { supabase } from './supabase';

export type WishReply = {
  id: string;
  wish_id: string;
  user_id: string | null;
  message: string;
  created_at: string;
};

/**
 * 建立一筆 wish reply
 * 
 * 優先嘗試透過後端 API（會自動觸發推播通知）
 * 如果後端 API 不可用，回退到直接寫入 Supabase（功能仍可用，但不會觸發推播）
 */
export async function createWishReply(
  wishId: string,
  message: string
): Promise<{ success: boolean; reply?: WishReply; error?: string }> {
  // 嘗試獲取當前用戶（如果已登入）
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch (authError) {
    // 未登入或獲取失敗，允許匿名（userId 為 null）
    console.log('[createWishReply] No user session, creating anonymous reply');
  }

  // 優先嘗試使用後端 API（會觸發推播通知）
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (apiBaseUrl) {
    try {
      const apiUrl = `${apiBaseUrl}/api/replies/create`;
      
      // 獲取認證 token（如果已登入）
      let authToken: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        authToken = session?.access_token || null;
      } catch (authError) {
        // 未登入，authToken 為 null（允許匿名）
      }

      // 設定超時（5 秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        console.log('[createWishReply] Calling API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
          body: JSON.stringify({
            wishId,
            message: message.trim(),
            userId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('[createWishReply] API response status:', response.status, response.statusText);

        // 檢查響應是否為空
        const responseText = await response.text();
        console.log('[createWishReply] API response length:', responseText.length);
        
        if (!responseText || responseText.trim().length === 0) {
          console.error('[createWishReply] API returned empty response. Status:', response.status);
          throw new Error(`API 返回空響應 (HTTP ${response.status})`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`API 返回無效的 JSON: ${responseText.substring(0, 100)}`);
        }

        if (response.ok && data.success && data.reply) {
          console.log('[createWishReply] Success via API');
          return {
            success: true,
            reply: {
              id: data.reply.id,
              wish_id: data.reply.wish_id,
              user_id: data.reply.user_id,
              message: data.reply.message,
              created_at: data.reply.created_at,
            },
          };
        } else {
          // API 返回錯誤，但不拋出異常，繼續嘗試直接寫入
          console.warn('[createWishReply] API returned error, falling back to direct write:', data.error);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // 如果是網路錯誤或超時，回退到直接寫入
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('Network request failed')) {
          console.warn('[createWishReply] API unavailable, falling back to direct write:', fetchError.message);
        } else {
          // 其他錯誤也回退
          console.warn('[createWishReply] API error, falling back to direct write:', fetchError.message);
        }
      }
    } catch (apiError: any) {
      console.warn('[createWishReply] API call failed, falling back to direct write:', apiError.message);
    }
  } else {
    console.log('[createWishReply] EXPO_PUBLIC_API_BASE_URL not set, using direct write');
  }

  // 回退方案：直接寫入 Supabase（不會觸發推播，但功能可用）
  try {
    const { data, error } = await supabase
      .from('wish_replies')
      .insert([
        {
          wish_id: wishId,
          user_id: userId,
          message: message.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[createWishReply] Direct write error:', error);
      throw new Error(`送出失敗：${error.message || '無法連接到伺服器'}`);
    }

    if (!data) {
      throw new Error('送出失敗：未收到回應');
    }

    console.log('[createWishReply] Success via direct write (no push notification)');
    return {
      success: true,
      reply: {
        id: data.id,
        wish_id: data.wish_id,
        user_id: data.user_id,
        message: data.message,
        created_at: data.created_at,
      },
    };
  } catch (error) {
    console.error('[createWishReply] Direct write exception:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '送出失敗：發生未知錯誤' };
  }
}

/**
 * 獲取某個 wish 的最新一筆 reply
 */
export async function getLatestWishReply(
  wishId: string
): Promise<WishReply | undefined> {
  try {
    const { data, error } = await supabase
      .from('wish_replies')
      .select('id, wish_id, user_id, message, created_at')
      .eq('wish_id', wishId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getLatestWishReply] Error:', error);
      return undefined;
    }

    if (!data) {
      return undefined;
    }

    return {
      id: data.id,
      wish_id: data.wish_id,
      user_id: data.user_id,
      message: data.message,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('[getLatestWishReply] Exception:', error);
    return undefined;
  }
}

