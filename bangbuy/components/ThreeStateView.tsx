/**
 * 🎨 三態畫面組件
 * 
 * 用於統一處理：載入中、無資料、錯誤三種狀態
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface ThreeStateViewProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  loadingComponent?: ReactNode;
  emptyComponent?: ReactNode;
  errorComponent?: ReactNode;
  children: ReactNode;
  onRetry?: () => void;
}

export default function ThreeStateView({
  loading,
  error,
  isEmpty,
  loadingComponent,
  emptyComponent,
  errorComponent,
  children,
  onRetry,
}: ThreeStateViewProps) {
  // Loading 狀態
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {loadingComponent || <DefaultLoading />}
      </div>
    );
  }

  // Error 狀態
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {errorComponent || <DefaultError message={error} onRetry={onRetry} />}
      </div>
    );
  }

  // Empty 狀態
  if (isEmpty) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {emptyComponent || <DefaultEmpty />}
      </div>
    );
  }

  // 正常狀態
  return <>{children}</>;
}

// 預設 Loading 組件
function DefaultLoading() {
  return (
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">載入中...</p>
    </div>
  );
}

// 預設 Empty 組件
function DefaultEmpty() {
  return (
    <div className="text-center max-w-md mx-auto px-6">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">📭</span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">目前沒有資料</h3>
      <p className="text-sm text-gray-500 mb-6">
        這裡還沒有任何內容，開始探索其他功能吧！
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        返回首頁
      </Link>
    </div>
  );
}

// 預設 Error 組件
function DefaultError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center max-w-md mx-auto px-6">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">載入失敗</h3>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            重試
          </button>
        )}
        <Link
          href="/"
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          返回首頁
        </Link>
      </div>
    </div>
  );
}

// 便利的 Hook: 自動處理三態邏輯
export function useThreeState<T>(data: T[] | null, loading: boolean, error: string | null) {
  return {
    loading,
    error,
    isEmpty: !loading && !error && (!data || data.length === 0),
    hasData: !loading && !error && data && data.length > 0,
  };
}


