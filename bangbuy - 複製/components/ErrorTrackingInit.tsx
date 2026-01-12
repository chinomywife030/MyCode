'use client';

import { useEffect } from 'react';
import { initErrorTracking, measurePageLoad, capturePerformance } from '@/lib/errorTracking';
import { usePathname } from 'next/navigation';

/**
 * 🔍 錯誤追蹤初始化組件
 * 
 * 放在 Providers 內部，初始化全域錯誤追蹤
 */
export default function ErrorTrackingInit() {
  const pathname = usePathname();

  // 初始化錯誤追蹤（只執行一次）
  useEffect(() => {
    initErrorTracking();
  }, []);

  // 每次路由變化時記錄頁面載入時間
  useEffect(() => {
    const startTime = performance.now();
    
    // 等待頁面渲染完成
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        capturePerformance('page_render', duration, pathname);
      });
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname]);

  return null;
}

