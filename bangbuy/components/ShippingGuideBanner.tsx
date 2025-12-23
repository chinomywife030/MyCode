'use client';

/**
 * 📦 ShippingGuideBanner - 運回台灣方式提示 Banner
 * 
 * 顯示在首頁搜尋區域上方，可關閉並記住狀態
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'bb_shipping_banner_dismissed';

export default function ShippingGuideBanner() {
  const [isDismissed, setIsDismissed] = useState(true); // 預設隱藏避免閃爍
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // SSR 或已關閉時不渲染
  if (!mounted || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">📦</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900">
                第一次使用？
                <Link 
                  href="/shipping-to-taiwan"
                  className="ml-1.5 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-semibold"
                >
                  先看：運回台灣方式
                </Link>
              </p>
              <p className="text-xs text-blue-600/70 mt-0.5 hidden sm:block">
                了解國際快遞、郵政、轉運、代購帶回等各種方案
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition"
            aria-label="關閉提示"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}




