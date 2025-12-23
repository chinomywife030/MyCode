/**
 * 🎛️ FilterSheet - 篩選面板
 * 
 * - 手機：Bottom Sheet
 * - 桌機：Popover
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUserMode } from '@/components/UserModeProvider';
import FilterPanel, { FilterValues } from './FilterPanel';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  hasQuery?: boolean;
  anchorRef?: React.RefObject<HTMLElement>;
}

export default function FilterSheet({
  isOpen,
  onClose,
  values,
  onChange,
  onClear,
  hasQuery = false,
  anchorRef,
}: FilterSheetProps) {
  const { mode } = useUserMode();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // 檢查裝置類型
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 點擊外部關閉（桌機）
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        sheetRef.current && 
        !sheetRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, onClose, anchorRef]);

  // ESC 關閉
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 防止背景滾動（手機）
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, isOpen]);

  if (!mounted || !isOpen) return null;

  const headerColor = mode === 'requester' ? 'text-blue-600' : 'text-orange-600';
  const buttonColor = mode === 'requester'
    ? 'bg-blue-500 hover:bg-blue-600'
    : 'bg-orange-500 hover:bg-orange-600';

  // ===== 手機：Bottom Sheet =====
  if (isMobile) {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-[60]"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={onClose}
        />

        {/* Sheet */}
        <div
          ref={sheetRef}
          className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl shadow-2xl"
          style={{
            maxHeight: '80vh',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
            <h3 className={`text-lg font-semibold ${headerColor}`}>
              篩選條件
            </h3>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 text-sm font-semibold text-white rounded-full ${buttonColor}`}
            >
              完成
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
            <FilterPanel
              values={values}
              onChange={onChange}
              onClear={onClear}
              hasQuery={hasQuery}
            />
          </div>
        </div>

        {/* Animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>,
      document.body
    );
  }

  // ===== 桌機：Popover =====
  const anchorRect = anchorRef?.current?.getBoundingClientRect();
  const popoverStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 8,
        right: window.innerWidth - anchorRect.right,
        zIndex: 60,
      }
    : {
        position: 'fixed',
        top: '120px',
        right: '20px',
        zIndex: 60,
      };

  return createPortal(
    <>
      {/* Popover */}
      <div
        ref={sheetRef}
        className="bg-white rounded-xl shadow-xl border border-gray-200"
        style={{
          ...popoverStyle,
          width: '320px',
          maxHeight: '70vh',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className={`text-sm font-semibold ${headerColor}`}>
            篩選條件
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 50px)' }}>
          <FilterPanel
            values={values}
            onChange={onChange}
            onClear={onClear}
            hasQuery={hasQuery}
          />
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>,
    document.body
  );
}





