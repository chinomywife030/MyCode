'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { useUserMode } from '@/components/UserModeProvider';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { t } = useLanguage();
  const { mode, toggleMode } = useUserMode();
  
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 路由變化時關閉選單
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
    <>
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          {/* ================= 左邊區域：漢堡 + Logo + 切換按鈕 ================= */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* 1. 漢堡選單 */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* 2. Logo 與 網站名稱 */}
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="transform transition-transform group-hover:rotate-12">
                <Logo className="w-8 h-8" />
              </div>
              <span className={`hidden sm:block text-xl font-black tracking-tighter transition-colors ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>
                {t.siteName}
              </span>
              <span className={`sm:hidden text-lg font-black tracking-tighter transition-colors ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>
                BangBuy
              </span>
            </Link>

            {/* 3. 身分切換按鈕 (保留在左邊) */}
            <button 
              onClick={toggleMode}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 border shrink-0
                ${mode === 'requester' 
                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                  : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                }`}
            >
              <span className="text-sm sm:text-base">{mode === 'requester' ? '🛍️' : '✈️'}</span>
              <span className="hidden sm:inline">{mode === 'requester' ? '買家' : '代購'}</span>
              <span className="opacity-50">⇄</span>
            </button>
          </div>

          {/* ================= 右邊區域：只剩下頭像/登入 ================= */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* ❌ 這裡的計算機按鈕已經移除了 */}

            {/* 頭像 / 登入 */}
            {user ? (
              <Link href="/dashboard" title="會員中心">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all border-2 shadow-sm
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
            ) : (
              <Link href="/login" className="text-gray-600 font-bold hover:text-blue-600 text-sm px-2 py-2 hover:bg-gray-100 rounded-lg transition whitespace-nowrap">
                登入
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ================= 側邊選單 (Drawer) ================= */}
      
      <div 
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      <div className={`fixed top-0 bottom-0 left-0 z-[101] w-80 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 relative">
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition"
          >
            ✕
          </button>

          {user ? (
            <div className="flex items-center gap-3 pr-8">
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-sm shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-2xl">
                    {user.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-gray-800 truncate text-lg">會員中心</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-xl font-bold text-gray-800">歡迎來到 BangBuy 👋</p>
              <Link href="/login" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                立即登入 / 註冊
              </Link>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          
          <div className="space-y-1">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🏠</span> 首頁
            </Link>
            
            {/* 計算機保留在選單裡 */}
            <Link href="/calculator" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🧮</span> 匯率計算機
            </Link>

            {user && (
              <>
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">👤</span> 我的個人頁面
                </Link>
                <Link href="/chat" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">💬</span> 訊息中心
                </Link>
                
                <div className="h-px bg-gray-100 my-3 mx-2"></div>
                
                {mode === 'requester' ? (
                  <Link href="/create" className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition">
                    <span className="text-xl">＋</span> 發布許願單
                  </Link>
                ) : (
                  <Link href="/trips/create" className="flex items-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-100 hover:bg-orange-600 transition">
                    <span className="text-xl">＋</span> 發布我的行程
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
              登出帳號
            </button>
          </div>
        )}
      </div>
    </>
  );
}