'use client';

/**
 * 🔄 RouteReloadGuard
 * 
 * 全域組件，監聽路由變化並執行一次性 reload
 * 用於解決「點擊通知/訊息跳轉後需要手動 F5」的問題
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { checkAndReload, cleanReloadedParam } from '@/lib/navigateWithReload';

export default function RouteReloadGuard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 監聽路由變化
  useEffect(() => {
    // 先清除 __reloaded 參數（美化 URL）
    cleanReloadedParam();

    // 檢查是否需要執行一次性 reload
    // 使用 setTimeout 確保在 Next.js 完成導航後執行
    const timer = setTimeout(() => {
      checkAndReload();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  // 這個組件不渲染任何 UI
  return null;
}






