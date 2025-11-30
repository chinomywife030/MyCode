'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { t, lang, changeLanguage } = useLanguage();
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
        
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-blue-600">
            {t.siteName}
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/trips" className="text-gray-600 font-medium hover:text-blue-600 transition">
              {/* @ts-ignore */}
              {t.trips || '✈️ 找行程'}
            </Link>
            <Link href="/calculator" className="text-gray-600 font-medium hover:text-blue-600 transition">
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

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {/* 🔽 關鍵修改：這裡連去 /dashboard (會員中心) */}
              <Link href="/dashboard" title="會員中心/我的收藏">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 transition">
                  {user.email?.[0].toUpperCase()}
                </div>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 whitespace-nowrap"
              >
                登出
              </button>
              <Link href="/create" className="hidden sm:block bg-blue-600 text-white px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md text-sm whitespace-nowrap">
                {t.createButton}
              </Link>
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