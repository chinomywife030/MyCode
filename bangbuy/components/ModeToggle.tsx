'use client';

/**
 * 💊 身分膠囊（Mode Pill）
 * 
 * 設計原則：
 * - 小巧不佔位（高度 28px）
 * - 0 學習成本（icon + 文字）
 * - 一眼可辨當前身份
 * - 點擊即切換，顯示 toast
 */

import { useUserMode } from '@/components/UserModeProvider';
import { useState, useEffect } from 'react';

interface ModeToggleProps {
  /** 自定義 className */
  className?: string;
}

export default function ModeToggle({ className = '', ...props }: ModeToggleProps & { 'data-tour'?: string }) {
  const { mode, setMode, toggleMode } = useUserMode();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Toast 自動消失
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleToggle = () => {
    toggleMode();
    const newMode = mode === 'requester' ? 'shopper' : 'requester';
    setToastMessage(newMode === 'requester' ? '已切換為買家模式' : '已切換為代購模式');
    setShowToast(true);
  };

  return (
    <>
      {/* 身分膠囊 */}
      <button
        onClick={handleToggle}
        data-tour="mode-toggle"
        className={`
          inline-flex items-center gap-1.5 rounded-full font-semibold
          transition-all duration-200 ease-out
          hover:shadow-md active:scale-95
          ${mode === 'requester'
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }
          ${className}
        `}
        style={{ 
          height: '28px',
          paddingLeft: '10px',
          paddingRight: '12px',
          fontSize: '13px',
          cursor: 'pointer'
        }}
        aria-label={`當前身份：${mode === 'requester' ? '買家' : '代購'}，點擊切換`}
      >
        <span style={{ fontSize: '14px' }} aria-hidden="true">
          {mode === 'requester' ? '🛒' : '✈️'}
        </span>
        <span>{mode === 'requester' ? '買家' : '代購'}</span>
      </button>

      {/* Toast 提示 */}
      {showToast && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down"
          style={{
            animation: 'fadeInDown 0.3s ease-out'
          }}
        >
          <div className={`
            px-4 py-2 rounded-full shadow-lg font-medium text-sm
            ${mode === 'requester' 
              ? 'bg-blue-600 text-white' 
              : 'bg-orange-600 text-white'
            }
          `}>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Toast 動畫 */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </>
  );
}

