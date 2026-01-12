'use client';

/**
 * 🔄 導航後自動重整一次的工具函數
 * 
 * 目的：避免使用者點通知/訊息跳轉後需要手動 F5 才更新的問題
 * 
 * 注意：這是一個「保底機制」，本質上是在掩蓋資料層更新/快取問題。
 * 應同時修正：
 * - chat page 依賴 URL 變化 refetch
 * - 禁用錯誤的 Next cache（api 加 no-store / dynamic）
 * - query invalidate（notifications / conversations / messages）
 */

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const RELOAD_KEY = 'bb_reload_key';
const RELOAD_PENDING = 'bb_reload_pending';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[navigateWithReload] ${message}`, data || '');
  }
};

/**
 * 導航到指定 URL，並在到達後自動重整一次
 * 
 * @param router - Next.js AppRouter instance
 * @param url - 目標 URL
 * @param key - 唯一識別 key（例如 'chat:abc-123' 或 'notif:xyz'）
 */
export function navigateWithOneReload(
  router: AppRouterInstance,
  url: string,
  key: string
): void {
  if (typeof window === 'undefined') return;

  log('Navigating with reload', { url, key });

  // 設置 reload 標記
  sessionStorage.setItem(RELOAD_KEY, key);
  sessionStorage.setItem(RELOAD_PENDING, '1');

  // 導航
  router.push(url);
}

/**
 * 檢查並執行一次性 reload
 * 應在 root layout 或全域 client component 中呼叫
 * 
 * @returns true 如果執行了 reload
 */
export function checkAndReload(): boolean {
  if (typeof window === 'undefined') return false;

  const pending = sessionStorage.getItem(RELOAD_PENDING);
  const key = sessionStorage.getItem(RELOAD_KEY);

  if (pending === '1' && key) {
    log('Reload pending detected', { key });

    // 立刻清除標記，避免無限循環
    sessionStorage.setItem(RELOAD_PENDING, '0');
    sessionStorage.removeItem(RELOAD_KEY);

    // 檢查 URL 是否已包含 __reloaded 參數（防呆）
    const url = new URL(window.location.href);
    if (url.searchParams.get('__reloaded') === '1') {
      log('Already reloaded, skipping');
      return false;
    }

    // ✅ 使用 replace 而不是 href，這樣不會在歷史記錄中添加新條目
    // 返回鍵可以正常回到上一頁
    log('Executing reload (replace)');
    window.location.replace(window.location.href);
    return true;
  }

  return false;
}

/**
 * 清除 URL 中的 __reloaded 參數（美化 URL）
 * 應在頁面載入後呼叫
 * 
 * 注意：現在使用 replace 刷新，不再添加 __reloaded 參數，
 * 但保留此函數以清理舊的 URL
 */
export function cleanReloadedParam(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.searchParams.has('__reloaded')) {
    url.searchParams.delete('__reloaded');
    window.history.replaceState({}, '', url.toString());
    log('Cleaned __reloaded param from URL');
  }
}

/**
 * 判斷是否應該使用 reload 導航
 * 用於特定頁面的跳轉（chat, order, wish_request, trip）
 */
export function shouldUseReloadNavigation(url: string): boolean {
  const reloadPatterns = [
    '/chat',
    '/order',
    '/wish/',
    '/trip/',
    '/notifications',
  ];

  return reloadPatterns.some(pattern => url.includes(pattern));
}

