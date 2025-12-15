'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useUserMode } from '@/components/UserModeProvider';
import { useNotificationBadge } from '@/hooks/useNotifications';

export default function BottomNav() {
  const pathname = usePathname();
  const { mode } = useUserMode();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // 🔔 使用真實的通知未讀數
  const { unreadCount: unreadNotificationCount } = useNotificationBadge();
  
  // 純 UI state，判斷當前頁面
  const isActive = (path: string) => pathname === path;
  
  return (
    <>
      {/* 手機版底部導航 - 使用橘藍配色 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          
          {/* Home */}
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive('/') 
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6 mb-0.5" fill={isActive('/') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className={`text-[10px] font-semibold ${isActive('/') ? 'text-orange-500' : ''}`}>
              首頁
            </span>
          </Link>

          {/* 🔔 Notifications */}
          <Link 
            href="/notifications"
            className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive('/notifications')
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6 mb-0.5" fill={isActive('/notifications') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* 紅點 badge */}
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-3 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-orange-500 text-white text-[9px] font-bold rounded-full">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
            <span className={`text-[10px] font-semibold ${isActive('/notifications') ? 'text-orange-500' : ''}`}>
              通知
            </span>
          </Link>

          {/* Messages */}
          <Link 
            href="/chat"
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive('/chat')
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6 mb-0.5" fill={isActive('/chat') ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-[10px] font-semibold ${isActive('/chat') ? 'text-orange-500' : ''}`}>
              訊息
            </span>
          </Link>

          {/* Profile */}
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive('/dashboard')
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-0.5 border-2 transition ${
              isActive('/dashboard')
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              W
            </div>
            <span className={`text-[10px] font-semibold ${isActive('/dashboard') ? 'text-orange-500' : ''}`}>
              我的
            </span>
          </button>
        </div>
      </nav>

      {/* Profile Menu Overlay - 純 UI */}
      {showProfileMenu && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="md:hidden fixed bottom-20 right-4 left-4 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100">
            <div className="p-2">
              <Link 
                href="/dashboard" 
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900">我的頁面</span>
              </Link>
              <Link 
                href="/calculator" 
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900">匯率計算器</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
