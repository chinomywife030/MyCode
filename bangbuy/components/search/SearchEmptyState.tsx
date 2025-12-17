/**
 * 🔍 SearchEmptyState - 搜尋無結果狀態（更聰明）
 */

'use client';

import { useUserMode } from '@/components/UserModeProvider';

interface SearchEmptyStateProps {
  query: string;
  hasFilters?: boolean;
  onClearQuery: () => void;
  onClearFilters: () => void;
  onClearAll: () => void;
}

export default function SearchEmptyState({
  query,
  hasFilters = false,
  onClearQuery,
  onClearFilters,
  onClearAll,
}: SearchEmptyStateProps) {
  const { mode } = useUserMode();

  const buttonColor = mode === 'requester'
    ? 'bg-blue-500 hover:bg-blue-600 text-white'
    : 'bg-orange-500 hover:bg-orange-600 text-white';

  const linkColor = mode === 'requester'
    ? 'text-blue-600 hover:text-blue-700'
    : 'text-orange-600 hover:text-orange-700';

  return (
    <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        找不到相關結果
      </h3>

      {query && (
        <p className="text-sm text-gray-500 mb-2">
          找不到符合「{query}」的{mode === 'requester' ? '行程' : '需求'}
        </p>
      )}

      {/* 建議 */}
      <div className="text-sm text-gray-500 mb-5 space-y-1">
        <p>💡 試試看：</p>
        <ul className="text-left max-w-xs mx-auto space-y-1">
          {query && query.length > 2 && (
            <li>• 使用更短的關鍵字</li>
          )}
          {hasFilters && (
            <li>• 移除部分篩選條件</li>
          )}
          <li>• 嘗試不同的搜尋詞</li>
        </ul>
      </div>

      {/* 按鈕 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {query && (
          <button
            onClick={onClearQuery}
            className={`
              px-5 py-2 rounded-full text-sm font-semibold
              transition-colors duration-200
              ${buttonColor}
            `}
          >
            清除搜尋
          </button>
        )}
        
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className={`
              text-sm font-medium
              transition-colors duration-200
              ${linkColor}
            `}
          >
            清除篩選條件
          </button>
        )}
        
        {(query && hasFilters) && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            重置全部
          </button>
        )}
      </div>
    </div>
  );
}

