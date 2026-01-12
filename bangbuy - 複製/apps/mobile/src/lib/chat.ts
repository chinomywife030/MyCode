/**
 * Chat 模組 - 使用 Server-Side API（重要更新）
 * 
 * 架構變更：
 * - 不再使用 client 端的 getOrCreateConversation（避免 RLS permission denied）
 * - 改為呼叫 Server API /api/chat/get-or-create-direct
 * - Server 端使用 Service Role Key 處理 conversation 建立
 * 
 * 這確保：
 * 1. Client 端永遠不會寫入 conversation_participants
 * 2. User A + User B 永遠只有一個對話（canonical）
 * 3. 不會出現 permission denied 錯誤
 */

import { router } from 'expo-router';
import { getCurrentUser } from './auth';
import { supabase } from './supabase';
import * as Haptics from 'expo-haptics';

/**
 * 取得 API Base URL
 */
function getApiBaseUrl(): string {
  // 優先使用環境變數
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // 開發環境 fallback
  if (__DEV__) {
    // 本地開發時使用 localhost（需要根據實際情況調整）
    return 'http://localhost:3000';
  }
  
  // Production fallback
  return 'https://bangbuy.vercel.app';
}

/**
 * 取得當前用戶的 access token
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('[chat] Failed to get access token:', error);
    return null;
  }
}

/**
 * 開啟與目標用戶的對話（使用 Server API）
 * 
 * 這是主要入口點，所有私訊按鈕都應該使用這個函數
 * 
 * @param targetUserId 目標用戶 ID
 * @param _sourceType 來源類型（保留參數，但 Server 端只使用 'direct'）
 * @param _sourceId 來源 ID（保留參數，但 Server 端忽略）
 * @param _sourceTitle 來源標題（保留參數，但 Server 端忽略）
 */
export async function startChat(
  targetUserId: string,
  _sourceType: 'wish_request' | 'trip' | 'listing' | 'legacy' | 'direct' = 'direct',
  _sourceId?: string,
  _sourceTitle?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. 檢查登入狀態
    const user = await getCurrentUser();
    if (!user) {
      router.push('/login');
      return { success: false, error: '請先登入' };
    }

    // 2. 不能私訊自己
    if (user.id === targetUserId) {
      return { success: false, error: '無法私訊自己' };
    }

    // 3. 取得 access token
    const token = await getAccessToken();
    if (!token) {
      router.push('/login');
      return { success: false, error: '登入狀態異常，請重新登入' };
    }

    // 4. 呼叫 Server API（核心變更）
    const apiBaseUrl = getApiBaseUrl();
    const apiUrl = `${apiBaseUrl}/api/chat/get-or-create-direct`;
    console.log('[startChat] Calling server API:', apiUrl);
    console.log('[startChat] Request body:', { otherUserId: targetUserId });
    
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          otherUserId: targetUserId,
        }),
      });
    } catch (fetchError: any) {
      console.error('[startChat] Fetch error:', fetchError);
      return { success: false, error: `網路錯誤：${fetchError.message}` };
    }

    console.log('[startChat] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[startChat] Server API error:', response.status, errorData);
      
      if (response.status === 401) {
        router.push('/login');
        return { success: false, error: '登入已過期，請重新登入' };
      }
      
      if (response.status === 405) {
        console.error('[startChat] 405 Method Not Allowed - API endpoint may not be deployed yet');
        return { 
          success: false, 
          error: 'API 尚未部署，請確認 /api/chat/get-or-create-direct 已正確部署' 
        };
      }
      
      return { 
        success: false, 
        error: errorData.error || `伺服器錯誤 (${response.status})` 
      };
    }

    const result = await response.json();
    
    if (!result.success || !result.conversationId) {
      return { success: false, error: result.error || '無法建立對話' };
    }

    console.log('[startChat] Got conversation ID:', result.conversationId, 'isNew:', result.isNew);

    // 5. 導向對話頁面
    router.push(`/chat/${result.conversationId}` as any);
    return { success: true, conversationId: result.conversationId };

  } catch (error: any) {
    console.error('[startChat] Error:', error);
    return { success: false, error: error.message || '開啟對話失敗' };
  }
}

/**
 * 取得對話中對方的資訊（使用 Server API）
 * 
 * @param conversationId 對話 ID
 */
export async function getPeerInfo(conversationId: string): Promise<{
  success: boolean;
  peer?: { id: string; name: string; avatar_url?: string | null };
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: '未登入' };
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/chat/peer?conversationId=${encodeURIComponent(conversationId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || '無法取得對方資訊' };
    }

    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('[getPeerInfo] Error:', error);
    return { success: false, error: error.message || '取得對方資訊失敗' };
  }
}

/**
 * 檢查是否可以發起私訊（不需要登入也可以呼叫，只檢查 targetUserId）
 */
export async function canStartChat(targetUserId: string): Promise<{
  canChat: boolean;
  requiresLogin: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    
    // 未登入
    if (!user) {
      return { canChat: false, requiresLogin: true };
    }
    
    // 不能私訊自己
    if (user.id === targetUserId) {
      return { canChat: false, requiresLogin: false, error: '無法私訊自己' };
    }
    
    return { canChat: true, requiresLogin: false };
    
  } catch (error: any) {
    return { canChat: false, requiresLogin: false, error: error.message };
  }
}
