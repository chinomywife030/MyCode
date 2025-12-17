/**
 * 🎛️ FilterPanel - 篩選面板內容
 * 
 * 共用於 FilterSheet (手機) 和 Popover (桌機)
 */

'use client';

import { useUserMode } from '@/components/UserModeProvider';

// 預設選項 - 統一使用大寫 country code
const DESTINATION_CHIPS = [
  { value: 'JP', label: '🇯🇵 日本' },
  { value: 'KR', label: '🇰🇷 韓國' },
  { value: 'US', label: '🇺🇸 美國' },
  { value: 'UK', label: '🇬🇧 英國' },
  { value: 'DE', label: '🇩🇪 德國' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'food', label: '🍜 食品' },
  { value: 'beauty', label: '💄 美妝' },
  { value: 'clothes', label: '👕 服飾' },
  { value: 'digital', label: '📱 3C' },
  { value: 'other', label: '📦 其他' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待處理' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done', label: '已完成' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: '最相關' },
  { value: 'newest', label: '最新' },
  { value: 'price_asc', label: '價格低到高' },
  { value: 'price_desc', label: '價格高到低' },
];

export interface FilterValues {
  destination?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
}

interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  hasQuery?: boolean;
}

export default function FilterPanel({
  values,
  onChange,
  onClear,
  hasQuery = false,
}: FilterPanelProps) {
  const { mode } = useUserMode();

  // 顏色依身份切換
  const activeChipColor = mode === 'requester'
    ? 'bg-blue-100 text-blue-700 border-blue-200'
    : 'bg-orange-100 text-orange-700 border-orange-200';

  const inactiveChipColor = 'bg-white text-gray-600 border-gray-200 hover:border-gray-300';

  const focusColor = mode === 'requester'
    ? 'focus:border-blue-500 focus:ring-blue-500/20'
    : 'focus:border-orange-500 focus:ring-orange-500/20';

  // 更新單一欄位
  const updateField = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  // 計算 active filter 數量
  const activeCount = [
    values.destination,
    values.category,
    values.priceMin,
    values.priceMax,
    values.dateFrom,
    values.dateTo,
    values.status,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* ===== 目的地 ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          目的地
        </label>
        
        {/* Quick Chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {DESTINATION_CHIPS.map(chip => (
            <button
              key={chip.value}
              type="button"
              onClick={() => updateField('destination', 
                values.destination === chip.value ? undefined : chip.value
              )}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full border
                transition-colors duration-200
                ${values.destination === chip.value ? activeChipColor : inactiveChipColor}
              `}
            >
              {chip.label}
            </button>
          ))}
        </div>
        
        {/* 自訂輸入 */}
        <input
          type="text"
          placeholder="或輸入其他地點..."
          value={values.destination || ''}
          onChange={(e) => updateField('destination', e.target.value || undefined)}
          className={`
            w-full h-9 px-3
            text-sm border border-gray-200 rounded-lg
            outline-none transition-all duration-200
            focus:ring-2 ${focusColor}
          `}
        />
      </div>

      {/* ===== 分類 ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          分類
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('category', opt.value || undefined)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full border
                transition-colors duration-200
                ${(values.category || '') === opt.value ? activeChipColor : inactiveChipColor}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 價格區間 ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          價格區間 (NTD)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="最低"
            value={values.priceMin || ''}
            onChange={(e) => updateField('priceMin', e.target.value ? Number(e.target.value) : undefined)}
            className={`
              flex-1 h-9 px-3
              text-sm border border-gray-200 rounded-lg
              outline-none transition-all duration-200
              focus:ring-2 ${focusColor}
            `}
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="最高"
            value={values.priceMax || ''}
            onChange={(e) => updateField('priceMax', e.target.value ? Number(e.target.value) : undefined)}
            className={`
              flex-1 h-9 px-3
              text-sm border border-gray-200 rounded-lg
              outline-none transition-all duration-200
              focus:ring-2 ${focusColor}
            `}
          />
        </div>
      </div>

      {/* ===== 狀態 ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          狀態
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('status', opt.value || undefined)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-full border
                transition-colors duration-200
                ${(values.status || '') === opt.value ? activeChipColor : inactiveChipColor}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 排序 ===== */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          排序方式
        </label>
        <select
          value={values.sort || (hasQuery ? 'relevance' : 'newest')}
          onChange={(e) => updateField('sort', e.target.value as FilterValues['sort'])}
          className={`
            w-full h-9 px-3
            text-sm border border-gray-200 rounded-lg
            outline-none transition-all duration-200
            cursor-pointer
            focus:ring-2 ${focusColor}
          `}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ===== 清除按鈕 ===== */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          清除所有篩選 ({activeCount})
        </button>
      )}
    </div>
  );
}

