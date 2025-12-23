/**
 * 🔍 SearchBar - 主搜尋列
 * 
 * - 單一輸入框 + 放大鏡 icon
 * - placeholder 依身份切換
 * - 300ms debounce
 * - Enter 觸發搜尋
 * - 有輸入時顯示「清除 X」
 */

'use client';

import { useRef, useCallback, KeyboardEvent } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onClear,
  onSubmit,
  className = '',
}: SearchBarProps) {
  const { mode } = useUserMode();
  const inputRef = useRef<HTMLInputElement>(null);

  // placeholder 依身份切換
  const placeholder = mode === 'requester'
    ? '搜尋目的地、商品、關鍵字'
    : '搜尋可接需求、目的地、關鍵字';

  // 主色依身份切換
  const focusColor = mode === 'requester'
    ? 'focus:border-blue-500 focus:ring-blue-500/20'
    : 'focus:border-orange-500 focus:ring-orange-500/20';

  const clearColor = mode === 'requester'
    ? 'text-blue-500 hover:text-blue-600'
    : 'text-orange-500 hover:text-orange-600';

  // Enter 觸發搜尋
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      onSubmit?.();
    }
  }, [onSubmit]);

  // 清除並 focus
  const handleClear = useCallback(() => {
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  return (
    <div className={`relative ${className}`}>
      {/* 放大鏡 icon */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 輸入框 */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`
          w-full h-10 pl-10 pr-10
          bg-gray-100 border border-transparent
          rounded-xl
          text-sm text-gray-900 placeholder-gray-500
          outline-none
          transition-all duration-200
          focus:bg-white focus:border-2 focus:ring-4
          ${focusColor}
        `}
        style={{ fontSize: '14px' }}
      />

      {/* 清除按鈕（有輸入時顯示） */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={`
            absolute right-3 top-1/2 transform -translate-y-1/2
            w-5 h-5 flex items-center justify-center
            rounded-full bg-gray-200 hover:bg-gray-300
            transition-colors
            ${clearColor}
          `}
          aria-label="清除搜尋"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}







