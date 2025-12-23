'use client';

/**
 * 🎫 useDailyChatQuota - 每日私訊配額管理
 * 
 * Premium Gate 軟限制：
 * - 免費用戶每天可主動發送私訊上限（預設 5 人）
 * - 超過上限時顯示提示（不提及付費）
 * - 同一對話不重複計算
 */

import { useState, useCallback, useEffect } from 'react';
import { safeRpc } from '@/lib/safeCall';

// 每日私訊上限（可從環境變數或配置讀取）
const DAILY_CHAT_LIMIT = 5;

export interface ChatQuotaState {
  /** 今日剩餘可聯繫的新用戶數 */
  remaining: number;
  /** 今日已聯繫的新用戶數 */
  contactedToday: number;
  /** 每日上限 */
  limit: number;
  /** 是否正在載入 */
  loading: boolean;
  /** 是否已達上限 */
  isLimitReached: boolean;
}

interface CheckQuotaResult {
  canSend: boolean;
  remaining: number;
  contactedToday: number;
  alreadyContacted?: boolean;
  limitReached?: boolean;
  error?: string;
}

interface UseDailyChatQuotaReturn {
  /** 配額狀態 */
  quota: ChatQuotaState;
  /** 檢查是否可以聯繫特定用戶 */
  checkCanContact: (targetUserId: string) => Promise<CheckQuotaResult>;
  /** 記錄已發起私訊（扣配額） */
  recordChatInitiated: (targetUserId: string) => Promise<boolean>;
  /** 刷新配額狀態 */
  refreshQuota: () => Promise<void>;
  /** 取得限制提示文字 */
  getLimitMessage: () => string;
}

export function useDailyChatQuota(): UseDailyChatQuotaReturn {
  const [quota, setQuota] = useState<ChatQuotaState>({
    remaining: DAILY_CHAT_LIMIT,
    contactedToday: 0,
    limit: DAILY_CHAT_LIMIT,
    loading: true,
    isLimitReached: false,
  });

  // 刷新配額狀態
  const refreshQuota = useCallback(async () => {
    try {
      const { data, error } = await safeRpc<{
        remaining: number;
        contacted_today: number;
        limit: number;
      }>('get_daily_chat_quota', { p_daily_limit: DAILY_CHAT_LIMIT });

      if (error) {
        console.error('[useDailyChatQuota] refreshQuota error:', error);
        return;
      }

      if (data) {
        setQuota({
          remaining: data.remaining,
          contactedToday: data.contacted_today,
          limit: data.limit,
          loading: false,
          isLimitReached: data.remaining <= 0,
        });
      }
    } catch (err) {
      console.error('[useDailyChatQuota] refreshQuota exception:', err);
    } finally {
      setQuota(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // 初始載入
  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // 檢查是否可以聯繫特定用戶
  const checkCanContact = useCallback(async (targetUserId: string): Promise<CheckQuotaResult> => {
    try {
      const { data, error } = await safeRpc<{
        can_send: boolean;
        remaining: number;
        contacted_today: number;
        already_contacted?: boolean;
        limit_reached?: boolean;
        error?: string;
      }>('check_daily_chat_quota', {
        p_target_user_id: targetUserId,
        p_daily_limit: DAILY_CHAT_LIMIT,
      });

      if (error) {
        console.error('[useDailyChatQuota] checkCanContact error:', error);
        return {
          canSend: false,
          remaining: quota.remaining,
          contactedToday: quota.contactedToday,
          error: error.message || '檢查失敗',
        };
      }

      if (data) {
        // 更新本地狀態
        setQuota(prev => ({
          ...prev,
          remaining: data.remaining,
          contactedToday: data.contacted_today,
          isLimitReached: !data.can_send && data.limit_reached === true,
        }));

        return {
          canSend: data.can_send,
          remaining: data.remaining,
          contactedToday: data.contacted_today,
          alreadyContacted: data.already_contacted,
          limitReached: data.limit_reached,
        };
      }

      return {
        canSend: true,
        remaining: quota.remaining,
        contactedToday: quota.contactedToday,
      };
    } catch (err) {
      console.error('[useDailyChatQuota] checkCanContact exception:', err);
      return {
        canSend: false,
        remaining: quota.remaining,
        contactedToday: quota.contactedToday,
        error: '發生錯誤',
      };
    }
  }, [quota.remaining, quota.contactedToday]);

  // 記錄已發起私訊
  const recordChatInitiated = useCallback(async (targetUserId: string): Promise<boolean> => {
    try {
      const { data, error } = await safeRpc<{
        success: boolean;
        already_contacted?: boolean;
        error?: string;
      }>('record_chat_initiated', {
        p_target_user_id: targetUserId,
      });

      if (error) {
        console.error('[useDailyChatQuota] recordChatInitiated error:', error);
        return false;
      }

      if (data?.success) {
        // 如果是新聯繫，更新本地配額
        if (!data.already_contacted) {
          setQuota(prev => ({
            ...prev,
            remaining: Math.max(0, prev.remaining - 1),
            contactedToday: prev.contactedToday + 1,
            isLimitReached: prev.remaining - 1 <= 0,
          }));
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useDailyChatQuota] recordChatInitiated exception:', err);
      return false;
    }
  }, []);

  // 取得限制提示文字（不提及付費）
  const getLimitMessage = useCallback((): string => {
    if (quota.isLimitReached) {
      return '你今天使用得很頻繁，為了維持平台品質，請明天再繼續。';
    }
    if (quota.remaining <= 2) {
      return `今日剩餘 ${quota.remaining} 次聯繫機會`;
    }
    return '';
  }, [quota.isLimitReached, quota.remaining]);

  return {
    quota,
    checkCanContact,
    recordChatInitiated,
    refreshQuota,
    getLimitMessage,
  };
}

export default useDailyChatQuota;







