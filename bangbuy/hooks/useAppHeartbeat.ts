'use client';

/**
 * 💓 useAppHeartbeat - 全站功能活性檢測 + 自動修復
 * 
 * 功能：
 * 1. 每 60 秒檢查 Realtime 是否 connected
 * 2. 頁面 focus/visibility 時檢查並修復
 * 3. 偵測到問題時自動 refetch + re-subscribe
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { registerRefetchCallback } from '@/lib/AppStatusProvider';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[heartbeat] ${message}`, data || '');
  }
};

// 配置
const HEARTBEAT_INTERVAL = 60 * 1000; // 60 秒
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 分鐘無資料流動視為 stale

interface UseAppHeartbeatOptions {
  onReconnect?: () => void;
  enabled?: boolean;
}

export function useAppHeartbeat(options: UseAppHeartbeatOptions = {}) {
  const { onReconnect, enabled = true } = options;
  
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef<boolean>(false);

  // 更新最後活動時間
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // 檢查連線狀態
  const checkConnection = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // 1. 檢查 auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        log('No session, skipping heartbeat');
        isCheckingRef.current = false;
        return;
      }

      // 2. 檢查是否超過 stale threshold
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceLastActivity > STALE_THRESHOLD) {
        log('Data might be stale, triggering reconnect', { 
          lastActivity: new Date(lastActivityRef.current).toISOString(),
          staleMs: timeSinceLastActivity 
        });
        
        // 觸發 refetch
        onReconnect?.();
        updateActivity();
      } else {
        log('Connection healthy', { 
          lastActivity: new Date(lastActivityRef.current).toISOString() 
        });
      }

    } catch (err) {
      console.error('[heartbeat] Check failed:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [onReconnect, updateActivity]);

  // 處理 visibility 變化
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      log('Page became visible, checking connection...');
      checkConnection();
    }
  }, [checkConnection]);

  // 處理 focus
  const handleFocus = useCallback(() => {
    log('Window focused, checking connection...');
    checkConnection();
  }, [checkConnection]);

  // 處理 online
  const handleOnline = useCallback(() => {
    log('Network back online, checking connection...');
    checkConnection();
  }, [checkConnection]);

  // 設置 heartbeat interval
  useEffect(() => {
    if (!enabled) return;

    log('Starting heartbeat interval');

    heartbeatIntervalRef.current = setInterval(() => {
      checkConnection();
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [enabled, checkConnection]);

  // 設置事件監聽
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, handleVisibilityChange, handleFocus, handleOnline]);

  // 暴露給外部使用
  return {
    updateActivity,
    checkConnection,
  };
}

// ============================================
// 全域 Heartbeat Provider Hook
// ============================================

export function useGlobalHeartbeat() {
  const refetchCallbacksRef = useRef<Set<() => void>>(new Set());

  // 全域 refetch
  const triggerGlobalRefetch = useCallback(() => {
    log('Triggering global refetch');
    refetchCallbacksRef.current.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('[heartbeat] Refetch callback error:', err);
      }
    });
  }, []);

  // 使用 heartbeat
  useAppHeartbeat({
    onReconnect: triggerGlobalRefetch,
    enabled: true,
  });

  // 註冊 refetch callback
  const registerRefetch = useCallback((callback: () => void) => {
    refetchCallbacksRef.current.add(callback);
    return () => {
      refetchCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    registerRefetch,
    triggerGlobalRefetch,
  };
}














