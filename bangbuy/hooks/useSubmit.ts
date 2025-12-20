/**
 * 🔒 防止重複提交 Hook
 * 
 * 目的：
 * 1. 防止使用者在短時間內重複提交
 * 2. 提交中鎖定按鈕狀態
 * 3. 避免重複評價、重複建立資料
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { logError } from '@/lib/errorLogger';

interface UseSubmitOptions {
  cooldown?: number; // 冷卻時間（毫秒）
  onError?: (error: any) => void;
  context?: string;
}

export function useSubmit(options: UseSubmitOptions = {}) {
  const { cooldown = 1000, onError, context } = options;
  
  const [submitting, setSubmitting] = useState(false);
  const lastSubmitTime = useRef<number>(0);

  const submit = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      const now = Date.now();
      
      // 檢查是否在冷卻時間內
      if (now - lastSubmitTime.current < cooldown) {
        console.warn('[useSubmit] 操作過於頻繁，請稍候再試');
        return null;
      }

      // 檢查是否正在提交
      if (submitting) {
        console.warn('[useSubmit] 正在處理中，請勿重複提交');
        return null;
      }

      try {
        setSubmitting(true);
        lastSubmitTime.current = now;
        
        const result = await fn();
        
        return result;
      } catch (error: any) {
        logError(error, {
          component: 'useSubmit',
          action: context || 'submit',
          severity: 'error',
        });

        if (onError) {
          onError(error);
        } else {
          console.error('[useSubmit] 提交失敗:', error);
        }

        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, cooldown, onError, context]
  );

  return {
    submit,
    submitting,
    canSubmit: !submitting,
  };
}

/**
 * 防止重複點擊的 Hook（更簡單的版本）
 */
export function useDebounceClick(callback: () => void | Promise<void>, delay: number = 500) {
  const [clicking, setClicking] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleClick = useCallback(async () => {
    if (clicking) {
      console.warn('[useDebounceClick] 點擊過快，已忽略');
      return;
    }

    setClicking(true);

    try {
      await callback();
    } catch (error) {
      console.error('[useDebounceClick] 執行失敗:', error);
    } finally {
      // 延遲恢復可點擊狀態
      timeoutRef.current = setTimeout(() => {
        setClicking(false);
      }, delay);
    }
  }, [clicking, callback, delay]);

  // 清理 timeout
  useCallback(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    handleClick,
    clicking,
  };
}

/**
 * 檢查操作是否已執行過（用於評價等一次性操作）
 */
export function useOnceOperation(key: string) {
  const [executed, setExecuted] = useState(false);
  const [checking, setChecking] = useState(true);

  // 從 localStorage 檢查是否已執行
  useState(() => {
    try {
      const stored = localStorage.getItem(`once_${key}`);
      setExecuted(stored === 'true');
    } catch (err) {
      console.error('[useOnceOperation] 檢查失敗:', err);
    } finally {
      setChecking(false);
    }
  });

  const markAsExecuted = useCallback(() => {
    try {
      localStorage.setItem(`once_${key}`, 'true');
      setExecuted(true);
    } catch (err) {
      console.error('[useOnceOperation] 標記失敗:', err);
    }
  }, [key]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(`once_${key}`);
      setExecuted(false);
    } catch (err) {
      console.error('[useOnceOperation] 重置失敗:', err);
    }
  }, [key]);

  return {
    executed,
    checking,
    markAsExecuted,
    reset,
    canExecute: !checking && !executed,
  };
}









