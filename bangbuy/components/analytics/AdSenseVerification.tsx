'use client';

/**
 * Google AdSense 網站驗證用 Script
 * 
 * 目的：僅用於驗證網站擁有權，不顯示任何廣告
 * - 僅在 production 環境載入
 * - 使用 next/script 載入
 * - 不影響目前 UI/UX
 */

import Script from 'next/script';

const AD_CLIENT_ID = 'ca-pub-3643262620675847';

export default function AdSenseVerification() {
  // 僅在 production 環境載入
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <Script
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}







