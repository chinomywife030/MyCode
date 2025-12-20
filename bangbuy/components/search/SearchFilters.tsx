/**
 * 🏷️ SearchFilters - 篩選 Chips
 * 
 * - 最多顯示 2 個 active filter
 * - 超過顯示 +N
 * - 支援 destination, category
 */

'use client';

import { useUserMode } from '@/components/UserModeProvider';

interface SearchFiltersProps {
  destination?: string;
  category?: string;
  onDestinationChange: (value?: string) => void;
  onCategoryChange: (value?: string) => void;
  onClearFilters: () => void;
  className?: string;
}

// 預設篩選選項
const DESTINATIONS = [
  { value: 'jp', label: '🇯🇵 日本' },
  { value: 'kr', label: '🇰🇷 韓國' },
  { value: 'us', label: '🇺🇸 美國' },
  { value: 'uk', label: '🇬🇧 英國' },
];

const CATEGORIES = [
  { value: 'food', label: '🍜 食品' },
  { value: 'beauty', label: '💄 美妝' },
  { value: 'clothes', label: '👕 服飾' },
  { value: 'digital', label: '📱 3C' },
  { value: 'other', label: '📦 其他' },
];

export default function SearchFilters({
  destination,
  category,
  onDestinationChange,
  onCategoryChange,
  onClearFilters,
  className = '',
}: SearchFiltersProps) {
  const { mode } = useUserMode();

  // 主色依身份切換
  const activeColor = mode === 'requester'
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : 'bg-orange-100 text-orange-700 border-orange-200';

  const hoverColor = mode === 'requester'
    ? 'hover:bg-blue-50 hover:border-blue-200'
    : 'hover:bg-orange-50 hover:border-orange-200';

  // 計算 active filters
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  
  if (destination) {
    const found = DESTINATIONS.find(d => d.value === destination);
    activeFilters.push({
      key: 'destination',
      label: found?.label || destination,
      onRemove: () => onDestinationChange(undefined),
    });
  }
  
  if (category) {
    const found = CATEGORIES.find(c => c.value === category);
    activeFilters.push({
      key: 'category',
      label: found?.label || category,
      onRemove: () => onCategoryChange(undefined),
    });
  }

  // 沒有 filter 時不顯示
  if (activeFilters.length === 0) return null;

  // 只顯示前 2 個
  const visibleFilters = activeFilters.slice(0, 2);
  const hiddenCount = activeFilters.length - 2;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Active filter chips */}
      {visibleFilters.map(filter => (
        <span
          key={filter.key}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5
            text-xs font-medium rounded-full border
            ${activeColor}
          `}
        >
          {filter.label}
          <button
            onClick={filter.onRemove}
            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            aria-label={`移除 ${filter.label}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}

      {/* +N indicator */}
      {hiddenCount > 0 && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${activeColor}`}>
          +{hiddenCount}
        </span>
      )}

      {/* 清除所有 */}
      {activeFilters.length > 0 && (
        <button
          onClick={onClearFilters}
          className={`
            text-xs text-gray-500 hover:text-gray-700
            px-2 py-1 rounded-full
            transition-colors
          `}
        >
          清除篩選
        </button>
      )}
    </div>
  );
}

/**
 * 🏷️ FilterDropdown - 篩選下拉選單（可選用）
 */
export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  mode,
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange: (value?: string) => void;
  mode: 'requester' | 'shopper';
}) {
  const activeColor = mode === 'requester'
    ? 'border-blue-500 bg-blue-50'
    : 'border-orange-500 bg-orange-50';

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={`
        text-xs font-medium px-3 py-1.5
        rounded-full border border-gray-200
        bg-white
        outline-none
        transition-all duration-200
        cursor-pointer
        ${value ? activeColor : 'hover:border-gray-300'}
      `}
    >
      <option value="">{label}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}




