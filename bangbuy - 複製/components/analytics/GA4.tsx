'use client';

/**
 * Google Analytics 4 (GA4) 元件
 * 
 * 功能：
 * - 只在 production 環境載入
 * - 需要 NEXT_PUBLIC_ANALYTICS_ENABLED=true 才載入
 * - 使用 next/script 注入，避免 SSR/hydration 問題
 * - 支援 App Router 的 route change page_view
 * - 預設關閉 send_page_view，自行在路由變化時送 page_view
 */

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

// 宣告 window.gtag 類型
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

const MEASUREMENT_ID = 'G-9PNSL6WSNM';

// 內部元件：處理路由追蹤
function GA4Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 監聽路由變化，手動送 page_view
  useEffect(() => {
    if (!window.gtag) return;

    // 取得完整 URL（包含 query string）
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // 手動送 page_view event
    window.gtag('event', 'page_view', {
      page_path: url,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GA4() {

  // 檢查是否應該載入 GA4
  const shouldLoadGA4 =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true' &&
    MEASUREMENT_ID;

  // 如果不符合條件，不渲染任何內容
  if (!shouldLoadGA4) {
    return null;
  }

  // 初始化 gtag
  useEffect(() => {
    // 初始化 dataLayer
    if (typeof window !== 'undefined' && !window.dataLayer) {
      window.dataLayer = [];
    }

    // 初始化 gtag 函數
    if (typeof window !== 'undefined' && !window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
    }

    // 初始化 GA4，設定 send_page_view: false
    if (window.gtag) {
      window.gtag('js', new Date());
      window.gtag('config', MEASUREMENT_ID, {
        send_page_view: false, // 關閉自動 page_view
      });
    }
  }, []);

  return (
    <>
      {/* 載入 Google Analytics 4 script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      {/* 路由追蹤（包裝在 Suspense 中以避免 SSR 問題） */}
      <Suspense fallback={null}>
        <GA4Tracker />
      </Suspense>
    </>
  );
}

