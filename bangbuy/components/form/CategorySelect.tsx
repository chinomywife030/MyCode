/**
 * 🏷️ CategorySelect - 分類選擇器
 * 
 * 視覺化的分類選擇（chips/pills 風格）
 */

'use client';

const CATEGORIES = [
  { value: 'toy', label: '玩具/公仔', emoji: '🧸' },
  { value: 'luxury', label: '精品', emoji: '👜' },
  { value: 'digital', label: '3C 電子', emoji: '📱' },
  { value: 'clothes', label: '服飾', emoji: '👕' },
  { value: 'beauty', label: '美妝', emoji: '💄' },
  { value: 'food', label: '零食/食品', emoji: '🍜' },
  { value: 'medicine', label: '藥妝', emoji: '💊' },
  { value: 'sports', label: '運動用品', emoji: '⚽' },
  { value: 'home', label: '居家用品', emoji: '🏠' },
  { value: 'other', label: '其他', emoji: '📦' },
];

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string;
}

export default function CategorySelect({
  value,
  onChange,
  className = '',
  error,
}: CategorySelectProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            type="button"
            onClick={() => onChange(cat.value)}
            className={`
              px-3 py-2 rounded-xl text-sm font-medium
              border-2 transition-all duration-200
              ${value === cat.value
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }
            `}
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

export { CATEGORIES };














