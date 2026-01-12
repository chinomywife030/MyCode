'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingCalculatorBtn() {
  const pathname = usePathname();

  // 如果已經在計算機頁面，就隱藏這個按鈕
  if (pathname === '/calculator') return null;

  return (
    <Link 
      href="/calculator"
      className="group fixed right-6 bottom-10 z-[50] flex items-center gap-2 pl-4 pr-5 py-3.5 bg-white/90 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full hover:scale-105 active:scale-95 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)]"
    >
      {/* 漸層圖示背景 */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-300">
        <span className="text-xl">🧮</span>
      </div>
      
      {/* 文字說明 */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Quick Tool</span>
        <span className="text-sm font-black text-gray-800 leading-none">匯率試算</span>
      </div>
      
      {/* 箭頭 (Hover 時移動) */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
      >
        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
      </svg>
    </Link>
  );
}