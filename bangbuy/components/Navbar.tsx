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
// SupporterBadge 暫時停用（Supporter 功能下線）
// import SupporterBadge from '@/components/SupporterBadge';

export default function Navbar() {
  const { t } = useLanguage();
  const { mode, toggleMode } = useUserMode();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ avatar_url: string | null; name: string | null; display_name?: string | null; is_supporter?: boolean; supporter_badge_hidden?: boolean } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now());
  
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
      // 查詢必要欄位（包含 Supporter 狀態）
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, display_name, is_supporter')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Navbar] Error fetching user profile:', error);
        setProfile(null);
        return;
      }

      setProfile(profileData);
      // 🔥 更新 avatar version 以觸發 cache-bust
      setAvatarVersion(Date.now());
    } catch (error) {
      console.error('[Navbar] Unexpected error fetching profile:', error);
      setProfile(null);
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
        setProfile(null);
      }
    });

    // 監聽頭像更新事件
    const handleAvatarUpdate = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
    };
  }, [fetchUserProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.refresh();
  };

  // 🔥 單一真相來源：只從 profiles.avatar_url 讀取，不再從 user_metadata fallback
  const profileAvatar = profile?.avatar_url ?? null;
  
  // 🔥 加入 cache-bust：確保瀏覽器不會顯示快取的舊圖片
  // 使用 avatarVersion state 避免每次 render 都改變 URL
  const avatarSrc = profileAvatar 
    ? `${profileAvatar}?v=${avatarVersion}` 
    : undefined;
  
  // 🐛 Debug log（完成後可移除）
  if (process.env.NODE_ENV === 'development' && user) {
    console.log('[HeaderAvatar]', { 
      profileAvatar,
      avatarSrc,
      avatarVersion,
      profileLoaded: !!profile,
      userId: user?.id
    });
  }

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

            <a href="/" className="flex items-center gap-2 group shrink-0">
              <div className="transform transition-transform group-hover:rotate-12"><Logo className="w-8 h-8" /></div>
              <span className={`hidden sm:block text-xl font-black tracking-tighter transition-colors duration-200 ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>{t.siteName}</span>
              <span className={`sm:hidden text-lg font-black tracking-tighter transition-colors duration-200 ${mode === 'shopper' ? 'text-orange-500' : 'text-blue-600'}`}>BangBuy</span>
            </a>

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
              <div className="flex items-center gap-2">
                {/* Supporter 徽章暫時停用（Supporter 功能下線） */}
                <a 
                  href="/profile" 
                  title="個人檔案"
                  onClick={(e) => {
                    console.log('[nav] go profile clicked (avatar)');
                  }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all duration-200 border-2 shadow-sm hover:shadow-md overflow-hidden ${
                      mode === 'shopper'
                        ? 'border-orange-100 hover:border-orange-300 bg-orange-50 text-orange-600'
                        : 'border-blue-100 hover:border-blue-300 bg-blue-50 text-blue-600'
                    }`}
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.email?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                  </div>
                </a>
              </div>
            ) : (
              <a href="/login" className="text-gray-500 font-bold hover:text-gray-900 text-sm px-2 py-2 hover:bg-gray-50 rounded-lg transition whitespace-nowrap">登入</a>
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
                {avatarSrc ? (
                  <img src={avatarSrc} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-gray-500 text-2xl">{user.email?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 truncate text-lg">
                    {profile?.display_name || '會員中心'}
                  </p>
                  {/* Supporter 徽章暫時停用（Supporter 功能下線） */}
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email || '用戶'}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              <p className="text-xl font-bold text-gray-800">歡迎來到 BangBuy 👋</p>
              <a href="/login" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition">立即登入 / 註冊</a>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          <div className="space-y-1">
            <a href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🏠</span> 首頁
            </a>

            {/* 📦 運回台灣方式（靠上位置，確保曝光）*/}
            <a href="/shipping-to-taiwan" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">📦</span> 運回台灣方式
            </a>

            <a href="/calculator" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
              <span className="text-xl">🧮</span> 匯率計算器
            </a>

            {/* Supporter 連結暫時停用（Supporter 功能下線） */}

            {user && (
              <>
                <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">👤</span> 我的頁面
                </a>
                <a 
                  href="/profile" 
                  onClick={(e) => {
                    console.log('[nav] go profile clicked');
                    setIsMenuOpen(false);
                  }} 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition"
                >
                  <span className="text-xl">✏️</span> 個人檔案
                </a>
                <a href="/chat" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition">
                  <span className="text-xl">💬</span> 訊息中心
                </a>
                {/* 設定入口暫時停用（設定功能下線） */}
                <div className="h-px bg-gray-100 my-3 mx-2" />
                {mode === 'requester' ? (
                  <a
                    href="/create"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">＋</span> 發布需求
                  </a>
                ) : (
                  <a
                    href="/trips/create"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-100 hover:bg-orange-600 transition-all duration-200"
                  >
                    <span className="text-xl">＋</span> 發布行程
                  </a>
                )}
              </>
            )}
          </div>

          {/* 📋 資訊區塊（僅 mobile） */}
          <div className="md:hidden mt-4 pt-4 border-t border-gray-100">
            <div className="px-2 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">資訊</p>
            </div>
            <div className="space-y-1">
              <a 
                href="/about" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                關於我們
              </a>
              <a 
                href="/contact" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                聯絡我們
              </a>
              <a 
                href="/privacy" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                隱私權政策
              </a>
              <a 
                href="/terms" 
                onClick={() => setIsMenuOpen(false)} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                使用條款
              </a>
            </div>
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
