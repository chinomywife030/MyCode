'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function Dashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); // 存個人資料
  const [activeTab, setActiveTab] = useState<'wishes' | 'trips' | 'favorites'>('wishes');
  
  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 1. 抓取 Profile 資料
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      setEditForm({ 
        name: profileData?.name || '', 
        bio: profileData?.bio || '' 
      });

      // 2. 抓許願
      const { data: wishes } = await supabase.from('wish_requests').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false });
      setMyWishes(wishes || []);

      // 3. 抓行程
      const { data: trips } = await supabase.from('trips').select('*').eq('shopper_id', user.id).order('created_at', { ascending: false });
      setMyTrips(trips || []);

      // 4. 抓收藏
      const { data: favs } = await supabase.from('favorites').select(`wish_id, wish_requests (*)`).eq('user_id', user.id);
      if (favs) {
        setMyFavorites(favs.map((f: any) => f.wish_requests).filter(Boolean));
      }

      setLoading(false);
    }
    initData();
  }, [router]);

  // 更新個人資料
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      let avatarUrl = profile.avatar_url;

      // 如果有上傳新圖片
      if (avatarFile) {
        const fileName = `avatar-${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, avatarFile); // 借用 wish-images bucket
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('profiles').update({
        name: editForm.name,
        bio: editForm.bio,
        avatar_url: avatarUrl
      }).eq('id', user.id);

      if (error) throw error;

      alert('更新成功！');
      setIsEditing(false);
      setProfile({ ...profile, name: editForm.name, bio: editForm.bio, avatar_url: avatarUrl });
      router.refresh();

    } catch (error: any) {
      alert('更新失敗: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWish = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    await supabase.from('wish_requests').delete().eq('id', id);
    setMyWishes(prev => prev.filter(w => w.id !== id));
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    await supabase.from('trips').delete().eq('id', id);
    setMyTrips(prev => prev.filter(t => t.id !== id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">載入中...</div>;

  const MenuButton = ({ id, icon, label }: { id: typeof activeTab, icon: string, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 
        ${activeTab === id ? 'bg-blue-600 text-white shadow-md font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 px-2">{t.dashboard.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* 左側選單 */}
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center relative group">
              
              {/* 編輯按鈕 */}
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 p-2"
                title="編輯資料"
              >
                ✏️
              </button>

              <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                    {profile?.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <p className="font-bold text-gray-800 truncate text-lg">{profile?.name}</p>
              <p className="text-xs text-gray-500 mb-4">{user.email}</p>
              
              <Link href={`/profile/${user.id}`} className="block w-full py-2 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition">
                {t.dashboard.viewProfile}
              </Link>
            </div>

            <nav className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-1">
              <MenuButton id="wishes" icon="🎁" label={t.dashboard.myWishes} />
              <MenuButton id="trips" icon="✈️" label={t.dashboard.myTrips} />
              <MenuButton id="favorites" icon="❤️" label={t.dashboard.myFavorites} />
            </nav>
          </aside>

          {/* 右側內容 */}
          <main className="md:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                {activeTab === 'wishes' && `🎁 ${t.dashboard.myWishes}`}
                {activeTab === 'trips' && `✈️ ${t.dashboard.myTrips}`}
                {activeTab === 'favorites' && `❤️ ${t.dashboard.myFavorites}`}
              </h2>

              {activeTab === 'wishes' && (
                <div className="space-y-4">
                  {myWishes.length === 0 ? <EmptyState text={t.dashboard.noWishes} /> : 
                    myWishes.map(wish => (
                      <div key={wish.id} className="group border border-gray-100 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                        <Link href={`/wish/${wish.id}`} className="flex-grow font-bold text-gray-800 hover:text-blue-600">
                          {wish.title} <span className="text-sm font-normal text-gray-500 ml-2">(${wish.budget})</span>
                        </Link>
                        <button onClick={() => handleDeleteWish(wish.id)} className="text-gray-400 hover:text-red-500 p-2">🗑️</button>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {myTrips.length === 0 ? <EmptyState text={t.dashboard.noTrips} /> : 
                    myTrips.map(trip => (
                      <div key={trip.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold">{trip.destination}</h3>
                          <p className="text-sm text-gray-500">{trip.date}</p>
                        </div>
                        <button onClick={() => handleDeleteTrip(trip.id)} className="text-red-400 hover:text-red-600 text-sm">刪除</button>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {myFavorites.length === 0 ? <p className="text-gray-500 text-center py-10 col-span-full">{t.dashboard.noFavorites}</p> : 
                    myFavorites.map(wish => (
                      <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden">
                        <div className="h-32 bg-gray-100 relative">
                           {wish.images && wish.images[0] ? <img src={wish.images[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">🎁</div>}
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-gray-800 line-clamp-1">{wish.title}</h4>
                          <p className="text-blue-600 font-bold text-sm mt-1">${wish.budget}</p>
                        </div>
                      </Link>
                    ))
                  }
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* 編輯資料彈窗 Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">編輯個人資料</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden mb-2 relative group cursor-pointer">
                  {avatarFile ? (
                    <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" />
                  ) : (
                    <img src={profile?.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                  )}
                  {/* 隱藏的檔案輸入框 */}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    更換
                    <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">點擊圖片更換頭像</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
                <input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">自我介紹</label>
                <textarea 
                  value={editForm.bio} 
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="介紹一下你自己..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">取消</button>
                <button type="submit" disabled={updating} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400">
                  {updating ? '儲存中...' : '儲存變更'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <span className="text-4xl mb-4 opacity-30">📂</span>
    <p>{text}</p>
  </div>
);