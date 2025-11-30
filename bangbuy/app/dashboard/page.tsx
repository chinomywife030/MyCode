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
  const [profile, setProfile] = useState<any>(null);
  // 🔽 新增 orders 分頁
  const [activeTab, setActiveTab] = useState<'wishes' | 'trips' | 'favorites' | 'orders'>('wishes');
  
  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]); // 🔽 新增訂單狀態
  const [loading, setLoading] = useState(true);

  // 編輯模式
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

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      setEditForm({ name: profileData?.name || '', bio: profileData?.bio || '' });

      // 抓許願
      const { data: wishes } = await supabase.from('wish_requests').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false });
      setMyWishes(wishes || []);

      // 抓行程
      const { data: trips } = await supabase.from('trips').select('*').eq('shopper_id', user.id).order('created_at', { ascending: false });
      setMyTrips(trips || []);

      // 抓收藏
      const { data: favs } = await supabase.from('favorites').select(`wish_id, wish_requests (*)`).eq('user_id', user.id);
      if (favs) setMyFavorites(favs.map((f: any) => f.wish_requests).filter(Boolean));

      // 🔽 抓訂單 (我是買家 OR 我是接單者)
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          wish_requests (title, images),
          profiles!orders_shopper_id_fkey (name), 
          buyer_profile:profiles!orders_buyer_id_fkey (name)
        `)
        .or(`buyer_id.eq.${user.id},shopper_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      setMyOrders(orders || []);

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
      if (avatarFile) {
        const fileName = `avatar-${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, avatarFile);
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

  // 🔽 更新訂單狀態
  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">載入會員資料...</div>;

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
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center relative group">
              <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 p-2">✏️</button>
              <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-200">
                {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">{profile?.name?.[0]?.toUpperCase()}</div>}
              </div>
              <p className="font-bold text-gray-800 truncate text-lg">{profile?.name}</p>
              <Link href={`/profile/${user.id}`} className="block w-full py-2 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition">{t.dashboard.viewProfile}</Link>
            </div>
            <nav className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-1">
              <MenuButton id="wishes" icon="🎁" label={t.dashboard.myWishes} />
              <MenuButton id="trips" icon="✈️" label={t.dashboard.myTrips} />
              <MenuButton id="favorites" icon="❤️" label={t.dashboard.myFavorites} />
              {/* 🔽 新增訂單按鈕 */}
              <MenuButton id="orders" icon="📦" label="我的訂單" />
            </nav>
          </aside>

          <main className="md:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                {activeTab === 'wishes' && `🎁 ${t.dashboard.myWishes}`}
                {activeTab === 'trips' && `✈️ ${t.dashboard.myTrips}`}
                {activeTab === 'favorites' && `❤️ ${t.dashboard.myFavorites}`}
                {activeTab === 'orders' && `📦 我的訂單`}
              </h2>

              {activeTab === 'wishes' && (
                <div className="space-y-4">
                  {myWishes.length === 0 ? <EmptyState text={t.dashboard.noWishes} /> : myWishes.map(wish => (
                    <div key={wish.id} className="group border border-gray-100 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                      <Link href={`/wish/${wish.id}`} className="flex-grow font-bold text-gray-800 hover:text-blue-600">{wish.title}</Link>
                      <button onClick={() => handleDeleteWish(wish.id)} className="text-gray-400 hover:text-red-500 p-2">🗑️</button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {myTrips.length === 0 ? <EmptyState text={t.dashboard.noTrips} /> : myTrips.map(trip => (
                    <div key={trip.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-4 flex justify-between items-center">
                      <div><h3 className="font-bold">{trip.destination}</h3><p className="text-sm text-gray-500">{trip.date}</p></div>
                      <button onClick={() => handleDeleteTrip(trip.id)} className="text-red-400 hover:text-red-600 text-sm">刪除</button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {myFavorites.length === 0 ? <p className="text-gray-500 text-center py-10 col-span-full">{t.dashboard.noFavorites}</p> : myFavorites.map(wish => (
                    <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden">
                      <div className="h-32 bg-gray-100 relative">{wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">🎁</div>}</div>
                      <div className="p-3"><h4 className="font-bold text-gray-800 line-clamp-1">{wish.title}</h4><p className="text-blue-600 font-bold text-sm mt-1">${wish.budget}</p></div>
                    </Link>
                  ))}
                </div>
              )}

              {/* 🔽 訂單列表 (新功能) */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {myOrders.length === 0 ? <EmptyState text="目前沒有進行中的訂單" /> : 
                    myOrders.map(order => {
                      const isBuyer = user.id === order.buyer_id;
                      return (
                        <div key={order.id} className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md transition bg-white">
                          {/* 圖片與標題 */}
                          <div className="flex gap-4 flex-grow">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                              {order.wish_requests?.images?.[0] ? <img src={order.wish_requests.images[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full">🎁</div>}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-800">{order.wish_requests?.title}</h4>
                              <p className="text-sm text-gray-500">
                                {isBuyer ? `接單人: ${order.profiles?.name}` : `買家: ${order.buyer_profile?.name}`}
                              </p>
                              <p className="text-sm font-bold text-blue-600 mt-1">${order.price}</p>
                            </div>
                          </div>

                          {/* 狀態與按鈕 */}
                          <div className="flex flex-col items-end gap-2 min-w-[120px]">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold 
                              ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {order.status === 'pending' ? '待確認' : 
                               order.status === 'accepted' ? '進行中' : 
                               order.status === 'completed' ? '已完成' : order.status}
                            </span>

                            {/* 只有買家可以接受訂單 */}
                            {isBuyer && order.status === 'pending' && (
                              <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700">
                                確認委託
                              </button>
                            )}
                            
                            {/* 雙方都可以按完成 */}
                            {order.status === 'accepted' && (
                              <button onClick={() => updateOrderStatus(order.id, 'completed')} className="border border-green-600 text-green-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-green-50">
                                完成訂單
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
      {/* (省略編輯 Modal 的部分，請保留原本的 Modal 程式碼) */}
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
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    更換
                    <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">點擊圖片更換頭像</p>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label><input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500" required/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">自我介紹</label><textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500" rows={4} placeholder="介紹一下你自己..."/></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">取消</button><button type="submit" disabled={updating} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400">{updating ? '儲存中...' : '儲存變更'}</button></div>
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