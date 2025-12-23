/**
 * 🎓 Smart Onboarding Hook
 * 
 * 管理一次性教學提示的顯示與關閉
 * 使用 localStorage 記錄是否已顯示過
 */

import { useState, useEffect, useCallback } from 'react';

// localStorage key 定義
export const ONBOARDING_KEYS = {
  ROLE_SWITCH: 'bangbuy_hint_role_switch',
  POST_ACTION: 'bangbuy_hint_post_action',
  CHAT_SAFETY: 'bangbuy_hint_chat_safety',
} as const;

type OnboardingKey = typeof ONBOARDING_KEYS[keyof typeof ONBOARDING_KEYS];

/**
 * 檢查是否已顯示過某個提示
 */
export function hasShownHint(key: OnboardingKey): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return true; // 如果 localStorage 不可用，視為已顯示
  }
}

/**
 * 標記某個提示已顯示
 */
export function markHintAsShown(key: OnboardingKey): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // localStorage 不可用時忽略錯誤
  }
}

/**
 * 重置所有提示（開發/測試用）
 */
export function resetAllHints(): void {
  if (typeof window === 'undefined') return;
  
  try {
    Object.values(ONBOARDING_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch {
    // localStorage 不可用時忽略錯誤
  }
}

/**
 * Onboarding Hook
 * 
 * @param key - 提示的唯一識別 key
 * @param autoShow - 是否自動顯示（預設 true）
 * @returns { shouldShow, show, hide }
 */
export function useOnboarding(key: OnboardingKey, autoShow: boolean = true) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化：檢查是否應該顯示
  useEffect(() => {
    const hasShown = hasShownHint(key);
    
    if (!hasShown && autoShow) {
      // 延遲一點顯示，避免閃爍
      const timer = setTimeout(() => {
        setShouldShow(true);
        setIsInitialized(true);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setIsInitialized(true);
    }
  }, [key, autoShow]);

  // 手動顯示
  const show = useCallback(() => {
    const hasShown = hasShownHint(key);
    if (!hasShown) {
      setShouldShow(true);
    }
  }, [key]);

  // 關閉並標記為已顯示
  const hide = useCallback(() => {
    setShouldShow(false);
    markHintAsShown(key);
  }, [key]);

  return {
    shouldShow: isInitialized && shouldShow,
    show,
    hide,
  };
}










