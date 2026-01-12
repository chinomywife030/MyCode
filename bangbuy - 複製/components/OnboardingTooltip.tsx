/**
 * 💡 Onboarding Tooltip - 半透明浮層樣式
 * 
 * 設計規範：
 * - 半透明背景（opacity 70%～80%）
 * - backdrop-filter: blur(8px)
 * - 圓角 12px
 * - 單層陰影，避免彈窗感
 * - 支援買家/代購模式顏色
 */

'use client';

import { useEffect, useRef } from 'react';

interface OnboardingTooltipProps {
  /** 是否顯示 */
  show: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 提示內容 */
  content: string;
  /** 位置（相對於父元素） */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 模式（買家/代購） */
  mode?: 'requester' | 'shopper';
  /** 自定義 className */
  className?: string;
}

export default function OnboardingTooltip({
  show,
  onClose,
  content,
  position = 'bottom',
  mode = 'requester',
  className = '',
}: OnboardingTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 延遲註冊，避免立即觸發
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  const positionClasses = {
    top: 'bottom-full mb-3 left-1/2 transform -translate-x-1/2',
    bottom: 'top-full mt-3 left-1/2 transform -translate-x-1/2',
    left: 'right-full mr-3 top-1/2 transform -translate-y-1/2',
    right: 'left-full ml-3 top-1/2 transform -translate-y-1/2',
  };

  // 半透明浮層樣式（依模式切換顏色）
  const floatingStyles = mode === 'requester'
    ? {
        backgroundColor: 'rgba(59, 130, 246, 0.75)',  // 藍色 75% 透明度
        color: 'white',
        borderColor: 'rgba(96, 165, 250, 0.3)',       // 淺藍邊框
      }
    : {
        backgroundColor: 'rgba(249, 115, 22, 0.75)',  // 橘色 75% 透明度
        color: 'white',
        borderColor: 'rgba(251, 146, 60, 0.3)',       // 淺橘邊框
      };

  return (
    <div
      ref={tooltipRef}
      className={`absolute z-50 ${positionClasses[position]} ${className}`}
      style={{
        animation: 'fadeInScale 0.3s ease-out',
      }}
    >
      {/* 半透明浮層內容 */}
      <div
        className="px-4 py-3 border max-w-xs relative"
        style={{
          ...floatingStyles,
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',  // Safari 支援
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',  // 單層陰影
        }}
      >
        <p className="text-sm leading-relaxed pr-6">{content}</p>
        
        {/* 關閉按鈕 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          aria-label="關閉提示"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 動畫 */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

