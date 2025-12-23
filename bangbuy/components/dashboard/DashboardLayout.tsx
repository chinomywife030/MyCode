'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { cleanupAllChannels } from '@/lib/realtime';
import { Profile } from '@/types';
import { isFeatureEnabled } from '@/lib/featureFlags';
import SupporterBadge from '@/components/SupporterBadge';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  activeTab?: string;
}

export default function DashboardLayout({ children, title, activeTab: activeTabProp }: DashboardLayoutProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  // 從 pathname 判斷 activeTab（硬跳轉時使用）
  const getActiveTabFromPath = () => {
    if (pathname === '/dashboard/wishes') return 'wishes';
    if (pathname === '/dashboard/trips') return 'trips';
    if (pathname === '/dashboard/orders') return 'orders';
    if (pathname === '/dashboard/favorites') return 'favorites';
    if (pathname === '/dashboard/reviews') return 'reviews';
    return null;
  };
  
  const activeTab = activeTabProp || getActiveTabFromPath() || 'wishes';
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 側邊欄選單項目（統一文案「我的 X」，順序：需求 → 行程 → 訂單 → 收藏）
  const menuItems = [
    { id: 'wishes', icon: '🎁', label: '我的需求', path: '/dashboard/wishes' },
    { id: 'trips', icon: '✈️', label: '我的行程', path: '/dashboard/trips' },
    { id: 'orders', icon: '📦', label: '我的訂單', path: '/dashboard/orders' },
    { id: 'favorites', icon: '❤️', label: '我的收藏', path: '/dashboard/favorites' },
  ];

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(profileData);
      setEditForm({ name: profileData?.name || '', bio: profileData?.bio || '' });
    }
    initData();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      let avatarUrl = profile?.avatar_url;
      
      // 1) 上傳頭像（如果有）
      if (avatarFile) {
        const fileName = `avatar-${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        avatarUrl = publicUrlData.publicUrl;
        console.log('[DashboardLayout] 新頭像 URL:', avatarUrl);
      }
      
      // 2) 更新 profiles 表（單一真相來源）
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          bio: editForm.bio,
          avatar_url: avatarUrl,
        })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      // 3) 🔒 保險：確認寫入成功（驗證 profiles.avatar_url 真的更新了）
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('avatar_url, name, bio')
        .eq('id', user?.id)
        .single();
      
      if (verifyError) {
        console.error('[DashboardLayout] 驗證失敗:', verifyError);
        throw new Error('無法驗證更新結果');
      }
      
      console.log('[DashboardLayout] 驗證成功，profiles.avatar_url =', verifyData.avatar_url);
      
      // 4) 更新本地 state
      setProfile({ ...profile, ...verifyData } as Profile);
      setIsEditing(false);
      
      // 5) 🔥 強制重整頁面（確保 Header 也更新）
      alert('更新成功！頁面即將重新載入');
      
      // 短暫延遲讓使用者看到提示
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error: any) {
      console.error('[DashboardLayout] 更新失敗:', error);
      alert('更新失敗: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGoHome = () => {
    window.location.assign('/');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await cleanupAllChannels();
      await supabase.auth.signOut();
      // Full page reload 導航
      window.location.assign('/login');
    } catch (error: any) {
      console.error('[Logout] Error:', error);
      alert('登出失敗，請重試');
      setIsLoggingOut(false);
    }
  };


  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        載入會員資料...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 px-2">{t.dashboard.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                    {profile?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              {/* 顯示名稱與 Supporter 徽章 */}
              <div className="mb-2">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 truncate text-lg">
                    {profile?.display_name || '未設定名稱'}
                  </p>
                  {profile?.is_supporter && profile?.display_name && !profile?.supporter_badge_hidden && (
                    <SupporterBadge size="small" />
                  )}
                </div>
                {!profile?.display_name && (
                  <p className="text-xs text-gray-500 mt-1">設定顯示名稱以完成個人檔案</p>
                )}
                {profile?.is_supporter && !profile?.display_name && (
                  <p className="text-xs text-gray-500 mt-1">設定顯示名稱以顯示 Supporter 徽章</p>
                )}
              </div>

              <a 
                href="/profile" 
                className="block w-full py-2 mt-4 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition text-center"
              >
                編輯個人檔案
              </a>
            </div>
            <nav className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 
                      ${isActive ? 'bg-blue-600 text-white shadow-md font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
              {/* 🔥 評價系統暫時關閉（Beta 階段） */}
              {false && isFeatureEnabled('ratings') && (
                <a
                  href="/dashboard/reviews"
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 
                    ${activeTab === 'reviews' ? 'bg-blue-600 text-white shadow-md font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <span className="text-xl">⭐</span>
                  <span>評價紀錄</span>
                </a>
              )}
              
              {/* 分隔線 + 操作按鈕 */}
              <div className="border-t border-gray-100 my-3 pt-3 space-y-2">
                {/* 回到首頁 */}
                <a
                  href="/"
                  className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                >
                  <span className="text-xl">🏠</span>
                  <span>回到首頁</span>
                </a>
                
                {/* 成為 Supporter（非 Supporter 才顯示） */}
                {!profile?.is_supporter && (
                  <a
                    href="/supporter/checkout"
                    className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 border border-purple-200 text-sm"
                  >
                    <span className="text-xl">⭐</span>
                    <span>成為 Supporter</span>
                  </a>
                )}
                
                {/* 登出 */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-xl">{isLoggingOut ? '⏳' : '🚪'}</span>
                  <span>{isLoggingOut ? '登出中...' : '登出'}</span>
                </button>
              </div>
            </nav>
          </aside>

          <main className="md:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                {title}
              </h2>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 編輯個人資料 Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">編輯個人資料</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600" aria-label="關閉">✕</button>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-2 relative group cursor-pointer">
                  {avatarFile ? (
                    <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" alt="Avatar preview" />
                  ) : (
                    <img src={profile?.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="Current avatar" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    上傳
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAvatarFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">點擊更換頭像</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">個人介紹</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="介紹一下自己..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" disabled={updating} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400">
                  {updating ? '更新中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

