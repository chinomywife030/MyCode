'use client';

/**
 * 🌱 EarlyAccessNotice - 早期體驗溫和提示組件
 * 
 * 設計原則：
 * - Info Banner / Toast 類型
 * - 顏色：淺藍 / 中性灰
 * - 字級：小於主內容
 * - 可手動關閉
 * - 不影響點擊流程
 * 
 * ❌ 禁止：Modal 擋全畫面、倒數計時、強制確認
 */

import { useState, useEffect } from 'react';

interface EarlyAccessNoticeProps {
  /** 提示類型 */
  type: 'first_contact' | 'active_usage' | 'standard';
  /** 是否顯示 */
  show: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 自動消失時間（毫秒），0 表示不自動消失 */
  autoHideDuration?: number;
}

// 根據類型取得訊息
const getMessage = (type: EarlyAccessNoticeProps['type']): string => {
  switch (type) {
    case 'first_contact':
      return '感謝你參與 BangBuy 的早期體驗，你的使用回饋將直接影響平台未來的設計方向。';
    case 'active_usage':
      return '你目前的使用狀況較為活躍，我們會持續優化體驗，確保每位使用者都能順利使用平台。';
    case 'standard':
    default:
      return '目前為 BangBuy 早期體驗期間，為維持社群運作品質，部分使用規則將隨平台成長逐步調整。';
  }
};

export function EarlyAccessNotice({
  type,
  show,
  onClose,
  autoHideDuration = 8000,
}: EarlyAccessNoticeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // 延遲一幀觸發動畫
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // 等待動畫結束後隱藏
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  // 自動消失
  useEffect(() => {
    if (!show || autoHideDuration === 0) return;

    const timer = setTimeout(() => {
      handleClose();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [show, autoHideDuration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 200);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] mx-auto
        transition-all duration-200 ease-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-start gap-3">
        {/* ℹ️ 圖標 */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* 訊息內容 */}
        <p className="flex-1 text-xs text-slate-600 leading-relaxed">
          {getMessage(type)}
        </p>

        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-500 transition-colors p-0.5 -m-0.5"
          aria-label="關閉提示"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * 🌱 EarlyAccessToast - 輕量級 Toast 提示（用於聯繫成功後）
 */
interface EarlyAccessToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

export function EarlyAccessToast({
  message,
  show,
  onClose,
  duration = 4000,
}: EarlyAccessToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        transition-all duration-200 ease-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className="bg-slate-700 text-white text-xs px-4 py-2 rounded-full shadow-lg">
        {message}
      </div>
    </div>
  );
}

export default EarlyAccessNotice;
