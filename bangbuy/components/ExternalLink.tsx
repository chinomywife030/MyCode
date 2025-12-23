/**
 * 🔗 外部連結組件
 * 
 * 顯示第三方免責提示
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  showWarning?: boolean; // 是否顯示警告 tooltip
}

export default function ExternalLink({
  href,
  children,
  className = '',
  showWarning = true,
}: ExternalLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isExternal = href.startsWith('http') || href.startsWith('//');

  if (!isExternal) {
    // 內部連結，直接使用 Next.js Link
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <div className="inline-block relative">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} inline-flex items-center gap-1`}
        onMouseEnter={() => showWarning && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {/* 外部連結圖示 */}
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* 🔐 第三方免責提示 Tooltip */}
      {showWarning && showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <div>
                <p className="font-semibold mb-1">外部連結提醒</p>
                <p className="leading-relaxed opacity-90">
                  此連結由第三方提供，本平台不負責其內容與交易風險（見
                  <Link href="/disclaimer" target="_blank" className="underline hover:text-blue-300 mx-0.5">
                    《免責聲明》
                  </Link>
                  ）。
                </p>
              </div>
            </div>
            {/* 三角形箭頭 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-8 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 🔗 外部連結警告文字組件（用於緊鄰連結顯示）
 */
export function ExternalLinkWarning() {
  return (
    <p className="text-xs text-gray-500 italic mt-1 flex items-center gap-1">
      <span>⚠️</span>
      <span>
        外部連結由第三方提供，本平台不負責其內容與交易風險（見
        <Link href="/disclaimer" className="text-blue-600 hover:underline mx-0.5">
          《免責聲明》
        </Link>
        ）。
      </span>
    </p>
  );
}












