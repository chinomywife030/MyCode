'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import { useUserMode } from '@/components/UserModeProvider';
import { useLanguage } from '@/components/LanguageProvider';
import ModeToggle from '@/components/ModeToggle';
import NotificationDrawer from '@/components/NotificationDrawer';
import { useNotificationBadge } from '@/hooks/useNotifications';

export default function Navbar() {
  const { t } = useLanguage();
  const { mode, toggleMode } = useUserMode();

  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 🔔 通知 drawer
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // 🔔 使用真實的通知未讀數（帶 revalidate 功能）
  const { unreadCount: unreadNotificationCount, revalidate: revalidateNotifications } = useNotificationBadge();

  // 每次打開通知 Drawer 時 revalidate
  const handleOpenNotifications = () => {
    setIsNotificationOpen(true);
    revalidateNotifications();
  };

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Fix: use maybeSingle() to handle case when profile doesn't exist yet
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Only log actual errors (not "profile not found")
        console.error('[Navbar] Error fetching user profile:', error);
        setAvatarUrl('');
      } else if (profile) {
        setAvatarUrl(profile.avatar_url || '');
      } else {
        // Profile doesn't exist yet - this is normal for new users
        setAvatarUrl('');
      }
    } catch (error) {
      // Fix: log unexpected errors
      console.error('[Navbar] Unexpected error fetching profile:', error);
      setAvatarUrl('');
    }
  }, []);

  useEffect(() => {
    async function initUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      }
    }
    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      } else {
        setAvatarUrl('');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAvatarUrl('');
    router.refresh();
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition active:scale-95"
              aria-label="開啟選單"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>

            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="transform transition-transform group-hover:rotate-12"><Logo className="w-8 h-8" /></div>
              <span className={`hidden sm:block text-xl font-black tracking-tighter transition-colors duration-200 ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>{t.siteName}</span>
              <span className={`sm:hidden text-lg font-black tracking-tighter transition-colors duration-200 ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>BangBuy</span>
            </Link>

            {/* 💊 身分膠囊 */}
            <ModeToggle className="shrink-0" />
          </div>

          <div className="flex items-center gap-2">
            {/* 桌機版：運回台灣方式連結 */}
            <Link 
              href="/shipping-to-taiwan" 
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>運回台灣方式</span>
            </Link>
            
            {user && (
              <>
                {/* 🔔 通知按鈕 */}
                <button
                  onClick={handleOpenNotifications}
                  className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition"
                  title="通知"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* 紅點 badge */}
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>
              </>
            )}
            
            {user ? (
              <Link href="/dashboard" title="會員中心">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all duration-200 border-2 shadow-sm hover:shadow-md overflow-hidden ${
                    mode === 'shopper'
                      ? 'border-orange-100 hover:border-orange-300 bg-orange-50 text-orange-600'
                      : 'border-blue-100 hover:border-blue-300 bg-blue-50 text-blue-600'
                  }`}
                >
                  {/* Fix: safe email access with fallback */}
                  {avatarUrl ? <img src={avatarUrl} alt="User" className="w-full h-full object-cover" /> : <span>{user.email?.[0]?.toUpperCase() || 'U'}</span>}
                </div>
              </Link>
            ) : (
              <Link href="/login" className="text-gray-500 font-bold hover:text-gray-900 text-sm px-2 py-2 hover:bg-gray-50 rounded-lg transition whitespace-nowrap">登入</Link>
            )}
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />
      <div className={`fixed top-0 bottom-0 left-0 z-[101] w-80 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 relative">
          <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition" aria-label="關閉選單">
            ✕
          </button>
          {user ? (
            <div className="flex items-center gap-3 pr-8">
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-sm shrink-0 flex items-center justify-center">
                {/* Fix: safe email access with fallback */}
                {avatarUrl ? <img src={avatarUrl} alt="User" className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500 text-2xl">{user.email?.[0]?.toUpperCase() || 'U'}</span>}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-gray-800 truncate text-lg">會員中心</p>
                <p className="text-xs text-gray-500 truncate">{user.email || '用戶'}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-xl font-bold text-gray-800">歡迎來到 BangBuy 👋</p>
              <Link href="/login" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">立即登入 / 註冊</Link>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          <div className="space-y-1">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🏠</span> 首頁
            </Link>

            {/* 📦 運回台灣方式（靠上位置，確保曝光）*/}
            <Link href="/shipping-to-taiwan" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">📦</span> 運回台灣方式
            </Link>

            <Link href="/calculator" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🧮</span> 匯率計算器
            </Link>

            {user && (
              <>
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">👤</span> 我的頁面
                </Link>
                <Link href="/chat" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">💬</span> 訊息中心
                </Link>
                <div className="h-px bg-gray-100 my-3 mx-2" />
                {mode === 'requester' ? (
                  <Link
                    href="/create"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">＋</span> 發布需求
                  </Link>
                ) : (
                  <Link
                    href="/trips/create"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-100 hover:bg-orange-600 transition-all duration-200"
                  >
                    <span className="text-xl">＋</span> 發布行程
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
              登出
            </button>
          </div>
        )}
      </div>

      {/* 🔔 通知 Drawer（純 UI） */}
      <NotificationDrawer 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
}
