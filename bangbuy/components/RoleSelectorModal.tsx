'use client';

import { useState, useEffect } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

export default function RoleSelectorModal() {
  const { setMode } = useUserMode();
  const [isOpen, setIsOpen] = useState(() => {
    // 檢查是否是第一次來 (如果沒有存過模式，就跳出視窗)
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('bangbuy_mode');
      return !savedMode;
    }
    return false;
  });

  const handleSelect = (role: 'requester' | 'shopper') => {
    setMode(role);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in">
        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">歡迎來到 BangBuy 👋</h2>
          <p className="text-gray-500 mb-8">請問您今天想使用什麼身分？</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 選項 A：我是刊登者 */}
            <button 
              onClick={() => handleSelect('requester')}
              className="group relative p-6 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="text-4xl mb-3">🛍️</div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">我是買家/刊登者</h3>
              <p className="text-sm text-gray-500 mt-2">我想找人幫我從國外代購商品，發布許願單。</p>
            </button>

            {/* 選項 B：我是留學生 */}
            <button 
              onClick={() => handleSelect('shopper')}
              className="group relative p-6 rounded-xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 transition text-left"
            >
              <div className="text-4xl mb-3">✈️</div>
              <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600">我是留學生/買手</h3>
              <p className="text-sm text-gray-500 mt-2">我正好要出國或回國，可以順便幫帶賺旅費。</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}