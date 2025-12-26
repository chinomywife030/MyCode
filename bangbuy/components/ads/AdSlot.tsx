'use client';

/**
 * 廣告插槽元件
 * 使用 FEATURE FLAG 控制是否顯示廣告
 * 
 * 使用方式：
 * 1. 在 Vercel 環境變數設定 NEXT_PUBLIC_ADS_ENABLED=true 即可開啟
 * 2. 預設為 false，不顯示任何廣告，不佔位，不影響 UX
 */

interface AdSlotProps {
  /** 廣告位置標識（例如：feed_mid, sidebar_top） */
  placement: string;
  /** 自訂 className */
  className?: string;
}

export default function AdSlot({ placement, className = '' }: AdSlotProps) {
  // FEATURE FLAG：只有明確設定為 "true" 才顯示
  const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

  // 若未啟用，完全不渲染，不佔位
  if (!ADS_ENABLED) {
    return null;
  }

  // 廣告卡容器（與需求卡片 UI 一致）
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
      data-ad-placement={placement}
    >
      {/* 廣告容器骨架 */}
      <div className="p-5 text-center">
        {/* TODO: 未來加入 Google AdSense 時，在這裡插入廣告 script */}
        {/* 
          範例：
          <div id={`ad-${placement}`} />
          <Script
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
            strategy="afterInteractive"
            onLoad={() => {
              if (window.adsbygoogle) {
                (window.adsbygoogle as any).push({});
              }
            }}
          />
        */}
        <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-sm text-gray-400">廣告位置：{placement}</p>
        </div>
      </div>
    </div>
  );
}



