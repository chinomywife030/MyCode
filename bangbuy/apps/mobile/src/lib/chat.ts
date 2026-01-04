import { router } from 'expo-router';
import { getCurrentUser } from './auth';
import { getOrCreateConversation } from './messaging';
import * as Haptics from 'expo-haptics';

/**
 * 開啟與目標用戶的對話
 * 
 * @param targetUserId 目標用戶 ID
 * @param sourceType 來源類型
 * @param sourceId 來源 ID（可選）
 * @param sourceTitle 來源標題（可選）
 */
export async function startChat(
  targetUserId: string,
  sourceType: 'wish_request' | 'trip' | 'listing' | 'legacy' | 'direct' = 'direct',
  sourceId?: string,
  sourceTitle?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 檢查登入狀態
    const user = await getCurrentUser();
    if (!user) {
      router.push('/login');
      return { success: false, error: '請先登入' };
    }

    // 不能私訊自己
    if (user.id === targetUserId) {
      return { success: false, error: '無法私訊自己' };
    }

    // 取得或建立對話
    const result = await getOrCreateConversation({
      targetUserId,
      sourceType,
      sourceId,
      sourceTitle,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    if (result.conversationId) {
      // 導向對話頁面
      router.push(`/chat/${result.conversationId}` as any);
      return { success: true, conversationId: result.conversationId };
    }

    return { success: false, error: '無法建立對話' };
  } catch (error: any) {
    console.error('[startChat] Error:', error);
    return { success: false, error: error.message || '開啟對話失敗' };
  }
}

