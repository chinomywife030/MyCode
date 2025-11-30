'use client';

import Calculator from '@/components/Calculator';
import Link from 'next/link';

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* 返回按鈕 */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="text-gray-500 hover:text-blue-600 font-medium flex items-center gap-1">
          ← 回首頁
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">代購費用試算</h1>
        <p className="text-gray-500">輸入金額與重量，快速計算到手價</p>
      </div>

      {/* 這裡直接放入我們之前做好的計算機元件 */}
      <Calculator />
      
    </div>
  );
}