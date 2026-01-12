'use client';

/**
 * 🌱 useEarlyAccess - 早期體驗使用狀況管理
 * 
 * 設計原則（五大策略）：
 * 
 * 一、目前階段定義
 * - 平台處於「早期體驗期間」
 * - 目標為建立信任與成功配對
 * - 不主動推付費、不顯示 Premium
 * 
 * 二、語意過渡設計
 * - 初期：「早期體驗期間，規則將隨平台成長逐步調整」
 * - 高頻：「平台成長中，為維持社群公平，使用規則正在優化」
 * 
 * 三、功能策略
 * - 冷啟動與成長期：不設硬性限制，僅記錄使用行為
 * - 未來僅在平台負載或濫用明顯時，才啟用實際限制
 * 
 * 四、Premium 預留（不可對使用者曝光）
 * - 僅服務「高頻、重度使用者」
 * - 不影響一般使用者完成基本流程
 */

import { useState, useCallback, useEffect } from 'react';
import { safeRpc } from '@/lib/safeCall';

// 內部追蹤參數（不對外曝露）
const ACTIVE_THRESHOLD = 3;      // 每日聯繫 3 人以上視為「活躍」
const VERY_ACTIVE_THRESHOLD = 5; // 每日聯繫 5 人以上視為「高頻」

export interface EarlyAccessState {
  /** 是否為早期體驗用戶（目前所有用戶都是） */
  isEarlyAccessUser: boolean;
  /** 是否已看過早期體驗提示 */
  hasSeenNotice: boolean;
  /** 使用狀況：normal | active | very_active */
  usageLevel: 'normal' | 'active' | 'very_active';
  /** 是否正在載入 */
  loading: boolean;
  /** 今日聯繫人數（內部追蹤用） */
  _contactedToday: number;
}

interface ContactCheckResult {
  /** 永遠為 true（早期體驗不限制） */
  canProceed: true;
  /** 是否已聯繫過此用戶 */
  alreadyContacted?: boolean;
  /** 是否顯示提示 */
  showNotice?: 'first_contact' | 'active_usage' | null;
}

interface UseEarlyAccessReturn {
  /** 早期體驗狀態 */
  state: EarlyAccessState;
  /** 檢查聯繫狀態（永遠允許，僅決定是否顯示提示） */
  checkContactStatus: (targetUserId: string) => Promise<ContactCheckResult>;
  /** 記錄已發起聯繫（僅追蹤，不限制） */
  recordContact: (targetUserId: string) => Promise<boolean>;
  /** 標記已看過早期體驗提示 */
  markNoticeAsSeen: () => void;
  /** 取得適合當前狀態的提示訊息 */
  getNoticeMessage: (type: 'first_contact' | 'active_usage' | 'standard') => string;
}

// 本地存儲 key
const STORAGE_KEY_NOTICE_SEEN = 'bangbuy_early_access_notice_seen';
const STORAGE_KEY_FIRST_CONTACT_SHOWN = 'bangbuy_first_contact_shown';

export function useEarlyAccess(): UseEarlyAccessReturn {
  const [state, setState] = useState<EarlyAccessState>({
    isEarlyAccessUser: true,
    hasSeenNotice: false,
    usageLevel: 'normal',
    loading: true,
    _contactedToday: 0,
  });

  // 初始化：從 localStorage 讀取是否已看過提示
  useEffect(() => {
    try {
      const noticeSeen = localStorage.getItem(STORAGE_KEY_NOTICE_SEEN) === 'true';
      setState(prev => ({
        ...prev,
        hasSeenNotice: noticeSeen,
        loading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // 刷新使用狀況（內部追蹤，不對外曝露數字）
  const refreshUsageLevel = useCallback(async () => {
    try {
      // 嘗試獲取使用數據（如果 RPC 不存在也沒關係）
      const { data, error } = await safeRpc<{
        remaining: number;
        contacted_today: number;
        limit: number;
      }>('get_daily_chat_quota', { p_daily_limit: 999 }); // 設超大值表示不限制

      if (error || !data) {
        // RPC 不存在或失敗，使用預設值
        setState(prev => ({ ...prev, usageLevel: 'normal', _contactedToday: 0 }));
        return;
      }

      // 判斷使用狀況等級（僅用於決定文案）
      let usageLevel: 'normal' | 'active' | 'very_active' = 'normal';
      if (data.contacted_today >= VERY_ACTIVE_THRESHOLD) {
        usageLevel = 'very_active';
      } else if (data.contacted_today >= ACTIVE_THRESHOLD) {
        usageLevel = 'active';
      }

      setState(prev => ({ 
        ...prev, 
        usageLevel,
        _contactedToday: data.contacted_today 
      }));
    } catch (err) {
      console.error('[useEarlyAccess] refreshUsageLevel error:', err);
    }
  }, []);

  useEffect(() => {
    refreshUsageLevel();
  }, [refreshUsageLevel]);

  // 檢查聯繫狀態（永遠允許，僅決定是否顯示提示）
  const checkContactStatus = useCallback(async (targetUserId: string): Promise<ContactCheckResult> => {
    // 🔑 核心：永遠返回 canProceed: true
    const result: ContactCheckResult = { canProceed: true };

    try {
      // 嘗試檢查是否已聯繫過（純追蹤用途）
      const { data, error } = await safeRpc<{
        can_send: boolean;
        remaining: number;
        contacted_today: number;
        already_contacted?: boolean;
      }>('check_daily_chat_quota', {
        p_target_user_id: targetUserId,
        p_daily_limit: 999, // 設超大值表示不限制
      });

      if (!error && data) {
        result.alreadyContacted = data.already_contacted;

        // 更新本地使用狀況
        let usageLevel: 'normal' | 'active' | 'very_active' = 'normal';
        if (data.contacted_today >= VERY_ACTIVE_THRESHOLD) {
          usageLevel = 'very_active';
        } else if (data.contacted_today >= ACTIVE_THRESHOLD) {
          usageLevel = 'active';
        }
        setState(prev => ({ 
          ...prev, 
          usageLevel,
          _contactedToday: data.contacted_today 
        }));

        // 決定是否顯示提示
        const firstContactShown = localStorage.getItem(STORAGE_KEY_FIRST_CONTACT_SHOWN) === 'true';
        
        // 首次聯繫他人時顯示歡迎提示
        if (!firstContactShown && !data.already_contacted) {
          result.showNotice = 'first_contact';
        }
        // 高頻使用者顯示溫和提醒（不阻斷）
        else if (usageLevel === 'very_active' && !data.already_contacted) {
          result.showNotice = 'active_usage';
        }
      }
    } catch (err) {
      console.error('[useEarlyAccess] checkContactStatus error:', err);
      // 錯誤時也允許繼續
    }

    return result;
  }, []);

  // 記錄聯繫（僅追蹤，不限制）
  const recordContact = useCallback(async (targetUserId: string): Promise<boolean> => {
    try {
      const { data, error } = await safeRpc<{
        success: boolean;
        already_contacted?: boolean;
      }>('record_chat_initiated', {
        p_target_user_id: targetUserId,
      });

      if (error) {
        console.error('[useEarlyAccess] recordContact error:', error);
        // 即使記錄失敗也返回 true（不阻斷用戶）
        return true;
      }

      if (data?.success) {
        // 標記首次聯繫已顯示
        try {
          localStorage.setItem(STORAGE_KEY_FIRST_CONTACT_SHOWN, 'true');
        } catch {}
        
        // 刷新使用狀況
        await refreshUsageLevel();
      }

      return true; // 永遠返回成功
    } catch (err) {
      console.error('[useEarlyAccess] recordContact exception:', err);
      return true; // 即使異常也返回 true
    }
  }, [refreshUsageLevel]);

  // 標記已看過提示
  const markNoticeAsSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTICE_SEEN, 'true');
      setState(prev => ({ ...prev, hasSeenNotice: true }));
    } catch {}
  }, []);

  // 取得提示訊息（語意過渡設計）
  const getNoticeMessage = useCallback((type: 'first_contact' | 'active_usage' | 'standard'): string => {
    switch (type) {
      case 'first_contact':
        // 初次互動補充文案
        return '感謝你參與 BangBuy 的早期體驗，你的使用回饋將直接影響平台未來的設計方向。';
      case 'active_usage':
        // 高頻使用者溫和提醒
        return '平台成長中，為維持社群公平，使用規則正在優化。感謝你的活躍參與！';
      case 'standard':
      default:
        // 標準提示
        return '目前為 BangBuy 早期體驗期間，為維持社群運作品質，部分使用規則將隨平台成長逐步調整。';
    }
  }, []);

  return {
    state,
    checkContactStatus,
    recordContact,
    markNoticeAsSeen,
    getNoticeMessage,
  };
}

export default useEarlyAccess;
