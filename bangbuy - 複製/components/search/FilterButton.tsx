/**
 * 🎛️ FilterButton - 篩選按鈕
 * 
 * - 顯示 active filters 數量 badge
 * - 點擊開啟 FilterSheet/Panel
 */

'use client';

import { forwardRef } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

interface FilterButtonProps {
  activeCount: number;
  onClick: () => void;
  className?: string;
}

const FilterButton = forwardRef<HTMLButtonElement, FilterButtonProps>(({
  activeCount,
  onClick,
  className = '',
}, ref) => {
  const { mode } = useUserMode();

  const buttonColor = mode === 'requester'
    ? 'hover:bg-blue-50 focus:ring-blue-500/20'
    : 'hover:bg-orange-50 focus:ring-orange-500/20';

  const badgeColor = mode === 'requester'
    ? 'bg-blue-500'
    : 'bg-orange-500';

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-3 h-10
        bg-gray-100 border border-transparent rounded-xl
        text-sm text-gray-700 font-medium
        transition-all duration-200
        hover:border-gray-200
        focus:outline-none focus:ring-4
        ${buttonColor}
        ${className}
      `}
    >
      {/* Filter Icon */}
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>

      <span className="hidden sm:inline">篩選</span>

      {/* Badge */}
      {activeCount > 0 && (
        <span
          className={`
            absolute -top-1.5 -right-1.5
            min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            text-[10px] font-bold text-white
            rounded-full
            ${badgeColor}
          `}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
});

FilterButton.displayName = 'FilterButton';

export default FilterButton;

