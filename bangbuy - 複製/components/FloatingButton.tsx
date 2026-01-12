'use client';

import Link from 'next/link';

export default function FloatingButton() {
  return (
    <Link 
      href="/calculator"
      className="fixed bottom-6 right-6 z-[90] group flex items-center justify-center p-4 bg-white text-gray-800 rounded-full shadow-xl shadow-blue-900/10 border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:scale-110 active:scale-95"
      title="匯率/運費試算"
    >
      {/* 圖示 */}
      <span className="text-2xl filter drop-shadow-sm">🧮</span>
      
      {/* 文字 (平常隱藏，Hover 時展開) */}
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 ease-in-out font-bold text-gray-700 whitespace-nowrap">
        匯率試算
      </span>
    </Link>
  );
}