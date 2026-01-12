'use client';

/**
 * 🌐 全域應用狀態管理
 * 
 * 功能：
 * 1. 監聽 Auth 事件（TOKEN_REFRESHED, TOKEN_REFRESH_FAILED, SIGNED_OUT）
 * 2. 監聽 visibilitychange / online 事件
 * 3. 提供全域 appStatus + refetchAll
 * 4. 自動處理 session 過期和重連
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { forceRefreshSession } from '@/lib/safeCall';
import { cleanupAllChannels } from '@/lib/realtime/simpleRealtime';

// ============================================
// 類型定義
// ============================================

export type AppStatus = 'ready' | 'reconnecting' | 'authExpired';

interface AppStatusContextType {
  status: AppStatus;
  lastRefresh: number;
  refetchAll: () => Promise<void>;
  forceReconnect: () => Promise<void>;
}

const AppStatusContext = createContext<AppStatusContextType | undefined>(undefined);

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (category: string, message: string, data?: any) => {
  if (isDev) {
    console.log(`[${category}] ${message}`, data || '');
  }
};

// ============================================
// 全域事件發射器（讓其他 Hook 能訂閱）
// ============================================

type RefetchCallback = () => Promise<void>;
const refetchCallbacks: Set<RefetchCallback> = new Set();

export function registerRefetchCallback(callback: RefetchCallback) {
  refetchCallbacks.add(callback);
  return () => {
    refetchCallbacks.delete(callback);
  };
}

// ============================================
// Provider 組件
// ============================================

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AppStatus>('ready');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  // 重連嘗試計數器（用於 exponential backoff）
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef<boolean>(false);

  // ============================================
  // 全域 refetchAll（通知所有已註冊的 callback）
  // ============================================
  const refetchAll = useCallback(async () => {
    log('app', 'refetchAll triggered');
    setLastRefresh(Date.now());

    const promises = Array.from(refetchCallbacks).map(cb => {
      return cb().catch(err => {
        console.error('[app] refetch callback error:', err);
      });
    });

    await Promise.allSettled(promises);
    log('app', 'refetchAll completed');
  }, []);

  // ============================================
  // 檢查 Session 有效性（加強版）
  // ============================================
  const checkSession = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        log('auth', 'No valid session found');
        return false;
      }

      // 檢查 token 是否快過期（5 分鐘內）
      const expiresAt = session.expires_at;
      const expiresIn = expiresAt ? expiresAt * 1000 - Date.now() : Infinity;
      
      // 🆕 如果是強制刷新，或 token 即將過期，則刷新
      if (forceRefresh || expiresIn < 5 * 60 * 1000) {
        log('auth', forceRefresh ? 'Force refreshing token...' : 'Token expiring soon, refreshing...');
        const refreshed = await forceRefreshSession();
        if (!refreshed) {
          log('auth', 'Token refresh failed');
          return false;
        }
        log('auth', 'Token refreshed successfully');
      }

      return true;
    } catch (err) {
      console.error('[auth] checkSession error:', err);
      return false;
    }
  }, []);

  // ============================================
  // 處理登出 + 清理
  // ============================================
  const handleSignOut = useCallback(async () => {
    log('auth', 'Signing out and redirecting to login');
    setStatus('authExpired');

    // 🆕 先清理所有 realtime channels（避免重連刷屏）
    try {
      cleanupAllChannels();
    } catch (err) {
      console.error('[auth] cleanup channels error:', err);
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[auth] signOut error:', err);
    }

    // 清除本地狀態
    if (typeof window !== 'undefined') {
      // 清除可能的快取
      sessionStorage.clear();
    }

    router.replace('/login');
  }, [router]);

  // ============================================
  // 強制重連（帶 exponential backoff）
  // ============================================
  const forceReconnect = useCallback(async () => {
    if (isReconnectingRef.current) {
      log('app', 'Already reconnecting, skipping...');
      return;
    }

    isReconnectingRef.current = true;
    setStatus('reconnecting');

    try {
      // 1. 檢查 session
      const hasSession = await checkSession();
      
      if (!hasSession) {
        await handleSignOut();
        return;
      }

      // 2. 成功 - 重置計數器並 refetch
      reconnectAttemptRef.current = 0;
      setStatus('ready');
      await refetchAll();
      log('app', 'Reconnect successful');

    } catch (err) {
      console.error('[app] forceReconnect error:', err);
      
      // 重試邏輯（exponential backoff）
      reconnectAttemptRef.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      
      log('realtime', `Reconnect failed, retry in ${delay}ms`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        isReconnectingRef.current = false;
        forceReconnect();
      }, delay);
      
    } finally {
      isReconnectingRef.current = false;
    }
  }, [checkSession, handleSignOut, refetchAll]);

  // ============================================
  // Auth 事件監聽
  // ============================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('auth', `Event: ${event}`, { hasSession: !!session });

      switch (event) {
        case 'TOKEN_REFRESHED':
          log('auth', 'TOKEN_REFRESHED');
          setStatus('ready');
          // 可選：刷新資料
          refetchAll();
          break;

        case 'SIGNED_OUT':
          log('auth', 'SIGNED_OUT -> redirect to login');
          setStatus('authExpired');
          router.replace('/login');
          break;

        case 'SIGNED_IN':
          log('auth', 'SIGNED_IN');
          setStatus('ready');
          refetchAll();
          break;

        // Supabase v2 沒有 TOKEN_REFRESH_FAILED 事件
        // 但我們可以在 safeCall 層處理
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, refetchAll]);

  // ============================================
  // Visibility + Online 事件監聽（🔨 暴力版：直接 reload）
  // ============================================
  const lastHiddenTimeRef = useRef<number>(0);
  const lastActivityTimeRef = useRef<number>(Date.now());
  
  // ⚠️ 常數
  const FORCE_RELOAD_THRESHOLD = 60 * 1000; // 離開超過 60 秒才刷新
  const ACTIVITY_GRACE_PERIOD = 5 * 1000;   // 最近 5 秒內有活動就不刷新
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 🆕 追蹤用戶活動（點擊、滾動、鍵盤）
    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };
    
    // 頁面可見性變化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 記錄切到背景的時間
        lastHiddenTimeRef.current = Date.now();
        log('app', 'Page hidden, recording time');
        return;
      }
      
      // visible - 回到前景
      const now = Date.now();
      const timeInBackground = lastHiddenTimeRef.current > 0 
        ? now - lastHiddenTimeRef.current 
        : 0;
      
      // 🆕 檢查最近是否有用戶活動（避免誤判）
      const timeSinceLastActivity = now - lastActivityTimeRef.current;
      
      log('app', `Page visible after ${Math.round(timeInBackground / 1000)}s in background`);
      
      // 🆕 如果最近有活動，不要刷新（用戶正在使用）
      if (timeSinceLastActivity < ACTIVITY_GRACE_PERIOD) {
        log('app', 'Recent activity detected, skipping reload');
        return;
      }
      
      // 🔨 暴力解法：超過閾值就直接 reload（但排除 Dashboard）
      if (timeInBackground > FORCE_RELOAD_THRESHOLD) {
        // Dashboard 內部導覽不執行 reload
        if (window.location.pathname.startsWith('/dashboard')) {
          log('app', 'Dashboard page - skipping reload');
          return;
        }
        log('app', '🔄 Force reloading page (was in background too long)');
        window.location.reload();
        return;
      }
      
      // 短時間背景：不需要特別處理
      log('app', 'Short background - no action needed');
    };

    // 網路恢復
    const handleOnline = () => {
      // 🆕 網路恢復時，如果最近有活動，不要刷新
      const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
      if (timeSinceLastActivity < ACTIVITY_GRACE_PERIOD) {
        log('app', 'Network online but user active, skipping reload');
        return;
      }
      
      // Dashboard 內部導覽不執行 reload
      if (window.location.pathname.startsWith('/dashboard')) {
        log('app', 'Dashboard page - skipping reload on network online');
        return;
      }
      log('app', 'Network back online - reloading page');
      window.location.reload();
    };

    // 網路斷開
    const handleOffline = () => {
      log('app', 'Network offline');
      setStatus('reconnecting');
    };

    // 監聽用戶活動
    document.addEventListener('click', updateActivity, { passive: true });
    document.addEventListener('keydown', updateActivity, { passive: true });
    document.addEventListener('scroll', updateActivity, { passive: true });
    document.addEventListener('touchstart', updateActivity, { passive: true });
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('click', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      document.removeEventListener('scroll', updateActivity);
      document.removeEventListener('touchstart', updateActivity);
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // 清理 timeout
  // ============================================
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AppStatusContext.Provider value={{ status, lastRefresh, refetchAll, forceReconnect }}>
      {children}
    </AppStatusContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAppStatus() {
  const context = useContext(AppStatusContext);
  
  if (context === undefined) {
    throw new Error('useAppStatus must be used within an AppStatusProvider');
  }
  
  return context;
}

// ============================================
// 可選：ReconnectingOverlay 組件
// ============================================

export function ReconnectingOverlay() {
  const { status } = useAppStatus();

  if (status !== 'reconnecting') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">連線恢復中...</span>
    </div>
  );
}

