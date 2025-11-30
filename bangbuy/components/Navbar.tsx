'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { useUserMode } from '@/components/UserModeProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { t, lang, changeLanguage } = useLanguage();
  const { mode, toggleMode } = useUserMode();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const languages = [
    { code: 'zh', label: '繁體中文 (TW)' },
    { code: 'en', label: 'English (US)' },
    { code: 'jp', label: '日本語 (JP)' },
    { code: 'kr', label: '한국어 (KR)' },
  ];
  
  // @ts-ignore
  const currentLangLabel = languages.find(l => l.code === lang)?.label || 'Language';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        
        {/* 左邊區域 */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          <Link href="/" className="flex items-center gap-2">
            <span className={`text-xl sm:text-2xl font-bold transition-colors ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>
              {t.siteName}
            </span>
          </Link>

          <button 
            onClick={toggleMode}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all shadow-sm active:scale-95
              ${mode === 'requester' 
                ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
              }`}
            title="點擊切換身分"
          >
            {mode === 'requester' ? '🛍️ 買家模式' : '✈️ 留學生模式'}
            <span className="text-gray-400 text-[10px]">⇄</span>
          </button>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/calculator" className="text-gray-600 font-medium hover:text-blue-600 transition whitespace-nowrap">
              {/* @ts-ignore */}
              {t.calculator || '💰 計算機'}
            </Link>
          </div>

          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition p-2 rounded-full hover:bg-gray-100">
              <span className="text-xl">🌍</span>
            </button>
            {isMenuOpen && (
              <div className="absolute top-12 left-0 w-40 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                {languages.map((item) => (
                  <button 
                    key={item.code} 
                    onClick={() => { changeLanguage(item.code as any); setIsMenuOpen(false); }} 
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition ${lang === item.code ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右邊區域 */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              
              {/* 🔽 新增：聊天室按鈕 (登入才看得到) */}
              <Link 
                href="/chat" 
                className="p-2 text-gray-500 hover:text-blue-600 transition hover:bg-blue-50 rounded-full relative group"
                title="我的訊息"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </Link>

              <Link href="/dashboard" title="會員中心">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:ring-2 transition text-white
                  ${mode === 'shopper' ? 'bg-orange-500 hover:ring-orange-300' : 'bg-blue-600 hover:ring-blue-300'}
                `}>
                  {user.email?.[0].toUpperCase()}
                </div>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 whitespace-nowrap"
              >
                登出
              </button>
              
              {mode === 'requester' ? (
                <Link href="/create" className="hidden sm:block bg-blue-600 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md text-sm whitespace-nowrap">
                  {t.createButton}
                </Link>
              ) : (
                <Link href="/trips/create" className="hidden sm:block bg-orange-500 text-white px-4 py-2 rounded-full font-medium hover:bg-orange-600 transition shadow-md text-sm whitespace-nowrap">
                  ＋ 發布行程
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-gray-600 font-medium hover:text-blue-600 text-sm whitespace-nowrap">
                登入
              </Link>
              <Link href="/create" className="bg-blue-600 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md text-sm whitespace-nowrap">
                {t.createButton}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}