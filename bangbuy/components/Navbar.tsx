'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { useUserMode } from '@/components/UserModeProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { t } = useLanguage();
  const { mode, toggleMode } = useUserMode();
  
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        if (profile) setAvatarUrl(profile.avatar_url || '');
      }
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

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        
        {/* 左邊區域 */}
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="transform transition-transform group-hover:rotate-12">
              <Logo className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            {/* 恢復顯示 LOGO 文字 */}
            <span className={`text-lg sm:text-xl font-black tracking-tighter transition-colors ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>
              {t.siteName}
            </span>
          </Link>

          <button 
            onClick={toggleMode}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 border shrink-0
              ${mode === 'requester' 
                ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
              }`}
          >
            <span className="sm:hidden">{mode === 'requester' ? '買家' : '代購'}</span>
            <span className="hidden sm:inline">{mode === 'requester' ? '🛍️ 買家模式' : '✈️ 留學生模式'}</span>
            <span className="text-gray-400 text-[10px] hidden sm:inline opacity-60">⇄ 切換</span>
          </button>
          
          {/* ❌ 這裡原本的計算機按鈕已經拿掉了，版面變乾淨了 */}
        </div>

        {/* 右邊區域 */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/chat" className="p-2 text-gray-500 hover:text-blue-600 transition hover:bg-blue-50 rounded-full relative group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              </Link>

              <Link href="/dashboard" title="會員中心">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all border-2 shrink-0
                  ${mode === 'shopper' 
                    ? 'border-orange-100 hover:border-orange-300 bg-orange-50 text-orange-600' 
                    : 'border-blue-100 hover:border-blue-300 bg-blue-50 text-blue-600'}
                `}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span>{user.email?.[0].toUpperCase()}</span>
                  )}
                </div>
              </Link>
              
              <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-500 px-1 sm:px-2 transition-colors whitespace-nowrap">登出</button>
              
              {mode === 'requester' ? (
                <Link href="/create" className="hidden md:block bg-blue-600 text-white px-5 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200 hover:shadow-lg active:scale-95 text-sm whitespace-nowrap">{t.createButton}</Link>
              ) : (
                <Link href="/trips/create" className="hidden md:block bg-orange-500 text-white px-5 py-2 rounded-full font-bold hover:bg-orange-600 transition shadow-md shadow-orange-200 hover:shadow-lg active:scale-95 text-sm whitespace-nowrap">＋ 發布行程</Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="text-gray-600 font-bold hover:text-blue-600 text-sm whitespace-nowrap transition-colors">登入</Link>
              <Link href="/create" className="bg-gray-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold hover:bg-black transition shadow-lg hover:shadow-xl active:scale-95 text-sm whitespace-nowrap">{t.createButton}</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}