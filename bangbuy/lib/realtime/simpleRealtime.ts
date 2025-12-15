'use client';

/**
 * 🔌 SimpleRealtime - 極簡 Realtime 管理
 * 
 * 核心原則：
 * 1. Realtime 只負責增量更新，不影響 loading 狀態
 * 2. 有重試上限（5 次），超過就停止
 * 3. 切到背景暫停，回前景自動恢復
 * 4. 同一個 key 只有一個 channel
 * 5. 不會無限重連刷 log
 * 
 * 🆕 增強：
 * - visibilitychange 觸發自動重連斷開的 channel
 * - 記錄離開時間，過久則重置 retry count
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================
// 簡單日誌
// ============================================

const isDev = process.env.NODE_ENV === 'development';

function log(msg: string) {
  if (isDev) {
    console.log(`[Realtime] ${msg}`);
  }
}

// ============================================
// Types
// ============================================

export type SimpleRealtimeStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface ChannelState {
  channel: RealtimeChannel | null;
  status: SimpleRealtimeStatus;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  isCleaning: boolean;
  connectFn?: () => void; // 🆕 保存連接函數以便重新觸發
}

// ============================================
// 常數
// ============================================

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;
const BACKGROUND_THRESHOLD_MS = 60 * 1000; // 1 分鐘：背景超過此時間則重置 retry

// ============================================
// 全域狀態
// ============================================

const channelStates = new Map<string, ChannelState>();
let isPageVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let globalListenersSet = false;
let lastHiddenTime = 0; // 🆕 記錄切到背景的時間

/**
 * 🆕 嘗試重連所有非 connected 的 channel
 */
function reconnectDisconnectedChannels() {
  const now = Date.now();
  const wasInBackgroundLong = lastHiddenTime > 0 && (now - lastHiddenTime) > BACKGROUND_THRESHOLD_MS;
  
  log(`Reconnecting channels (background=${wasInBackgroundLong ? 'long' : 'short'})`);
  
  channelStates.forEach((state, key) => {
    // 如果離開太久，重置 retry count
    if (wasInBackgroundLong && state.status === 'failed') {
      log(`Resetting retry count for "${key}" (was in background too long)`);
      state.retryCount = 0;
      state.status = 'idle';
    }
    
    // 嘗試重連非 connected 的 channel
    if (state.status !== 'connected' && state.status !== 'connecting') {
      if (state.connectFn) {
        log(`Triggering reconnect for "${key}"`);
        state.connectFn();
      }
    }
  });
}

function setupGlobalListeners() {
  if (globalListenersSet || typeof window === 'undefined') return;
  globalListenersSet = true;

  document.addEventListener('visibilitychange', () => {
    const wasVisible = isPageVisible;
    isPageVisible = document.visibilityState === 'visible';
    log(`Visibility: ${isPageVisible ? 'visible' : 'hidden'}`);
    
    if (!isPageVisible) {
      // 🆕 記錄切到背景的時間
      lastHiddenTime = Date.now();
    } else if (!wasVisible && isPageVisible && isOnline) {
      // 🆕 從背景回來，嘗試重連
      reconnectDisconnectedChannels();
    }
  });

  window.addEventListener('online', () => {
    isOnline = true;
    log('Online');
    // 🆕 網路恢復，嘗試重連
    if (isPageVisible) {
      reconnectDisconnectedChannels();
    }
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    log('Offline');
  });
  
  // 🆕 focus 事件也觸發檢查
  window.addEventListener('focus', () => {
    if (isOnline && isPageVisible) {
      log('Window focused');
      reconnectDisconnectedChannels();
    }
  });
}

// ============================================
// 核心函數
// ============================================

function getOrCreateState(key: string): ChannelState {
  let state = channelStates.get(key);
  if (!state) {
    state = {
      channel: null,
      status: 'idle',
      retryCount: 0,
      retryTimer: null,
      isCleaning: false,
    };
    channelStates.set(key, state);
  }
  return state;
}

function cleanupChannel(key: string) {
  const state = channelStates.get(key);
  if (!state) return;

  state.isCleaning = true;

  if (state.retryTimer) {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  if (state.channel) {
    try {
      supabase.removeChannel(state.channel);
    } catch (e) {
      // 忽略
    }
    state.channel = null;
  }

  state.isCleaning = false;
}

// ============================================
// React Hook
// ============================================

interface UseSimpleRealtimeOptions<T = any> {
  /** 唯一 key，例如 `messages:${conversationId}` */
  key: string;
  /** 是否啟用 */
  enabled?: boolean;
  /** 監聽的表名 */
  table: string;
  /** 過濾條件 */
  filter?: string;
  /** 事件類型 */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** 回調 */
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useSimpleRealtime<T = any>(options: UseSimpleRealtimeOptions<T>) {
  const {
    key,
    enabled = true,
    table,
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  const [status, setStatus] = useState<SimpleRealtimeStatus>('idle');
  const mountedRef = useRef(true);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange });
  const keyRef = useRef(key);

  // 更新 callbacks
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };
  }, [onInsert, onUpdate, onDelete, onChange]);

  // 主訂閱邏輯
  useEffect(() => {
    setupGlobalListeners();
    
    if (!enabled) {
      setStatus('idle');
      return;
    }

    // key 變了，先清理舊的
    if (keyRef.current !== key) {
      cleanupChannel(keyRef.current);
      keyRef.current = key;
    }

    const state = getOrCreateState(key);

    // 已經連接或正在連接，不重建
    if (state.status === 'connected' || state.status === 'connecting') {
      setStatus(state.status);
      return;
    }

    // 清理之前的
    cleanupChannel(key);

    // 連接函數
    const connect = () => {
      if (!mountedRef.current) return;
      if (!isPageVisible || !isOnline) {
        log(`Skip connect "${key}" (visible=${isPageVisible}, online=${isOnline})`);
        return;
      }

      const currentState = getOrCreateState(key);
      
      // 🆕 保存 connect 函數，以便 visibilitychange 時重新觸發
      currentState.connectFn = connect;
      
      if (currentState.isCleaning) {
        log(`Skip connect "${key}" - cleaning`);
        return;
      }

      if (currentState.status === 'connected') {
        return;
      }
      
      // 🆕 如果正在 connecting，不要重複
      if (currentState.status === 'connecting') {
        return;
      }

      log(`Connecting "${key}" (attempt ${currentState.retryCount + 1}/${MAX_RETRIES})`);
      currentState.status = 'connecting';
      setStatus('connecting');

      try {
        const channel = supabase.channel(key);

        channel.on(
          'postgres_changes',
          { event, schema: 'public', table, filter },
          (payload: RealtimePostgresChangesPayload<T>) => {
            const cbs = callbacksRef.current;
            
            if (payload.eventType === 'INSERT' && cbs.onInsert) {
              cbs.onInsert(payload);
            } else if (payload.eventType === 'UPDATE' && cbs.onUpdate) {
              cbs.onUpdate(payload);
            } else if (payload.eventType === 'DELETE' && cbs.onDelete) {
              cbs.onDelete(payload);
            }
            
            if (cbs.onChange) {
              cbs.onChange(payload);
            }
          }
        );

        channel.subscribe((subscribeStatus, err) => {
          const s = getOrCreateState(key);
          
          if (s.isCleaning) return;

          if (subscribeStatus === 'SUBSCRIBED') {
            log(`Connected "${key}"`);
            s.status = 'connected';
            s.retryCount = 0;
            s.channel = channel;
            if (mountedRef.current) {
              setStatus('connected');
            }
          } else if (
            subscribeStatus === 'TIMED_OUT' ||
            subscribeStatus === 'CLOSED' ||
            subscribeStatus === 'CHANNEL_ERROR'
          ) {
            log(`"${key}" ${subscribeStatus}`);
            
            // 清理這個 channel
            try {
              supabase.removeChannel(channel);
            } catch (e) {}
            
            s.channel = null;

            // 檢查是否超過重試上限
            if (s.retryCount >= MAX_RETRIES) {
              log(`"${key}" max retries reached, stopping`);
              s.status = 'failed';
              if (mountedRef.current) {
                setStatus('failed');
              }
              return;
            }

            // 排程重試
            s.retryCount++;
            const delay = BASE_DELAY * Math.pow(2, s.retryCount - 1);
            
            log(`"${key}" retry in ${delay}ms`);

            if (s.retryTimer) {
              clearTimeout(s.retryTimer);
            }

            s.retryTimer = setTimeout(() => {
              if (mountedRef.current && isPageVisible && isOnline) {
                connect();
              }
            }, delay);
          }
        });

        currentState.channel = channel;
      } catch (err) {
        console.error(`[Realtime] Error creating "${key}":`, err);
        currentState.status = 'failed';
        setStatus('failed');
      }
    };

    // 開始連接
    connect();

    // Cleanup
    return () => {
      // 不在這裡 cleanup channel，讓它保持活著
      // 只有當 key 改變或 enabled 變成 false 時才清理
    };
  }, [key, enabled, table, filter, event]);

  // Component unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 手動重連
  const reconnect = useCallback(() => {
    const state = getOrCreateState(key);
    state.retryCount = 0;
    cleanupChannel(key);
    // 下一個 render 會重新連接
  }, [key]);

  return {
    status,
    isConnected: status === 'connected',
    isFailed: status === 'failed',
    reconnect,
  };
}

// ============================================
// 清理函數（用於登出等）
// ============================================

export function cleanupAllChannels() {
  log('Cleaning up all channels');
  for (const key of channelStates.keys()) {
    cleanupChannel(key);
  }
  channelStates.clear();
}

