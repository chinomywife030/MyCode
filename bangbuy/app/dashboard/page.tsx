'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { navigateWithOneReload } from '@/lib/navigateWithReload';
import { cleanupAllChannels } from '@/lib/realtime';
import ReviewModal from '@/components/ReviewModal';
import ReviewSection from '@/components/ReviewSection';
import UberStyleReviewSection from '@/components/UberStyleReviewSection';
import EmptyState from '@/components/EmptyState';
import { Profile } from '@/types';

export default function Dashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'wishes' | 'trips' | 'favorites' | 'orders' | 'reviews'>('wishes');

  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🎨 純 UI state：用來控制收藏按鈕的視覺狀態
  const [likedWishes, setLikedWishes] = useState<Record<string, boolean>>({});

  const [reviewModal, setReviewModal] = useState<{ open: boolean; orderId: string; targetId: string; targetName: string } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // 🆕 登出狀態
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || null); // Fix: ensure null if no data
      setEditForm({ name: profileData?.name || '', bio: profileData?.bio || '' });

      const { data: wishes } = await supabase.from('wish_requests').select('*').eq('buyer_id', user.id).order('created_at', { ascending: false });
      setMyWishes(wishes || []);

      const { data: trips } = await supabase.from('trips').select('*').eq('shopper_id', user.id).order('created_at', { ascending: false });
      setMyTrips(trips || []);

      const { data: favs } = await supabase.from('favorites').select(`wish_id, wish_requests (*)`).eq('user_id', user.id);
      if (favs) {
        const favorites = favs.map((f: any) => f.wish_requests).filter(Boolean);
        // Fix: Debug - 檢查收藏的願望是否有無效 buyer_id
        console.log('✅ [Dashboard] 獲取', favorites.length, '筆收藏的願望');
        if (favorites.length > 0) {
          const invalidFavs = favorites.filter((w: any) => 
            !w.buyer_id || 
            w.buyer_id === '00000000-0000-0000-0000-000000000000'
          );
          if (invalidFavs.length > 0) {
            console.warn('⚠️ [Dashboard] 收藏中有', invalidFavs.length, '筆願望的 buyer_id 無效！');
            console.warn('⚠️ [Dashboard] 願望 IDs:', invalidFavs.map((w: any) => w.id));
          }
        }
        setMyFavorites(favorites);
      }

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

      if (orders) {
        const visibleOrders = orders.filter((o) => {
          if (o.buyer_id === user.id) return !o.archived_by_buyer;
          if (o.shopper_id === user.id) return !o.archived_by_shopper;
          return true;
        });
        setMyOrders(visibleOrders);
      }

      setLoading(false);
    }
    initData();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        const fileName = `avatar-${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(fileName, avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('wish-images').getPublicUrl(fileName);
        avatarUrl = publicUrlData.publicUrl;
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          bio: editForm.bio,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);
      if (error) throw error;
      alert('更新成功');
      setIsEditing(false);
      setProfile({ ...profile, name: editForm.name, bio: editForm.bio, avatar_url: avatarUrl } as Profile);
      router.refresh();
    } catch (error: any) {
      alert('更新失敗: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWish = async (id: string) => {
    if (!confirm('確定要刪除這個需求嗎？')) return;
    await supabase.from('wish_requests').delete().eq('id', id);
    setMyWishes((prev) => prev.filter((w) => w.id !== id));
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    await supabase.from('trips').delete().eq('id', id);
    setMyTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const handleArchiveOrder = async (order: any) => {
    const isBuyer = order.buyer_id === user.id;
    const fieldToUpdate = isBuyer ? 'archived_by_buyer' : 'archived_by_shopper';

    if (!confirm('確定要隱藏這筆訂單嗎？\n(隱藏後仍保留於資料庫，可向客服協助恢復)')) return;

    const { error } = await supabase.from('orders').update({ [fieldToUpdate]: true }).eq('id', order.id);

    if (error) {
      alert('操作失敗: ' + error.message);
    } else {
      setMyOrders((prev) => prev.filter((o) => o.id !== order.id));
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, wishId?: string) => {
    try {
      await supabase.from('orders').update({ status }).eq('id', orderId);

      if (status === 'completed' && wishId) {
        await supabase.from('wish_requests').update({ status: 'closed' }).eq('id', wishId);
      }

      setMyOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (error) {
      console.error('更新訂單狀態失敗', error);
    }
  };

  // 🆕 回到首頁
  const handleGoHome = () => {
    router.push('/');
  };

  // 🆕 登出
  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      // 1. 清理 Realtime 訂閱
      cleanupAllChannels();
      
      // 2. 登出 Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // 3. 清除本地儲存（只清 supabase 相關的 key）
      if (typeof window !== 'undefined') {
        // 清除 sessionStorage
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // 清除 localStorage
        const localKeysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            localKeysToRemove.push(key);
          }
        }
        localKeysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      // 4. 導向登入頁
      router.replace('/login');
      
    } catch (error: any) {
      console.error('[Logout] Error:', error);
      alert('登出失敗，請重試');
      setIsLoggingOut(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">載入會員資料...</div>;

  const MenuButton = ({ id, icon, label }: { id: typeof activeTab; icon: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 
        ${activeTab === id ? 'bg-blue-600 text-white shadow-md font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const renderVerificationStatus = () => {
    const status = profile?.verification_status || 'unverified';
    if (status === 'verified') {
      return <div className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold inline-block mt-2">已驗證學生</div>;
    } else if (status === 'pending') {
      return <div className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-bold inline-block mt-2">身份審核中</div>;
    } else {
      return (
        <Link href="/verify" className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs px-3 py-1 rounded-full font-bold inline-block mt-2 transition">
          前往驗證身份
        </Link>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 px-2">{t.dashboard.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center relative group">
              <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 p-2" aria-label="編輯個人資料">✏️</button>
              <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-200">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Profile avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                    {/* Fix: safe string access with fallback */}
                    {profile?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <p className="font-bold text-gray-800 truncate text-lg">{profile?.name || '會員'}</p>

              {renderVerificationStatus()}

              <Link href={`/profile/${user.id}`} className="block w-full py-2 mt-4 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition">
                {t.dashboard.viewProfile}
              </Link>
            </div>
            <nav className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-1">
              <MenuButton id="wishes" icon="🎁" label={t.dashboard.myWishes} />
              <MenuButton id="trips" icon="✈️" label={t.dashboard.myTrips} />
              <MenuButton id="favorites" icon="❤️" label={t.dashboard.myFavorites} />
              <MenuButton id="orders" icon="📦" label="我的訂單" />
              <MenuButton id="reviews" icon="⭐" label="評價紀錄" />
              
              {/* 🆕 分隔線 + 操作按鈕 */}
              <div className="border-t border-gray-100 my-3 pt-3 space-y-2">
                {/* 回到首頁 */}
                <button
                  onClick={handleGoHome}
                  className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                >
                  <span className="text-xl">🏠</span>
                  <span>回到首頁</span>
                </button>
                
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
                {activeTab === 'wishes' && `🎁 ${t.dashboard.myWishes}`}
                {activeTab === 'trips' && `✈️ ${t.dashboard.myTrips}`}
                {activeTab === 'favorites' && `❤️ ${t.dashboard.myFavorites}`}
                {activeTab === 'orders' && `📦 我的訂單`}
                {activeTab === 'reviews' && `⭐ 評價紀錄`}
              </h2>

              {activeTab === 'wishes' && (
                <div className="space-y-4">
                  {myWishes.length === 0 ? (
                    <EmptyState 
                      icon="🎁" 
                      title="還沒有願望"
                      description="你還沒有發布任何願望，開始發布你的第一個代購需求吧！"
                      actionLabel="發布願望"
                      actionHref="/create"
                    />
                  ) : (
                    myWishes.map((wish) => {
                      // 🎨 純 UI：模擬狀態
                      const mockStatus = wish.status || 'pending';
                      const getStatusStyle = (status: string) => {
                        switch(status) {
                          case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
                          case 'done': return 'bg-orange-100 text-orange-700 border-orange-200';
                          default: return 'bg-gray-100 text-gray-600 border-gray-200';
                        }
                      };
                      const getStatusText = (status: string) => {
                        switch(status) {
                          case 'in_progress': return '進行中';
                          case 'done': return '已完成';
                          default: return '待處理';
                        }
                      };

                      return (
                      <div key={wish.id} className="group border border-gray-100 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <Link href={`/wish/${wish.id}`} className="flex-grow font-bold text-gray-800 hover:text-blue-600">
                            {wish.title}
                          </Link>
                          <div className="flex items-center gap-2">
                            {/* ✨ 狀態標籤（純 UI） */}
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${getStatusStyle(mockStatus)}`}>
                              {getStatusText(mockStatus)}
                            </span>
                            <button onClick={() => handleDeleteWish(wish.id)} className="text-gray-400 hover:text-red-500 p-2" aria-label="刪除需求">
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {myTrips.length === 0 ? (
                    <EmptyState 
                      icon="✈️" 
                      title="還沒有行程"
                      description="你還沒有發布任何代購行程，開始規劃你的第一個行程吧！"
                      actionLabel="發布行程"
                      actionHref="/trips/create"
                    />
                  ) : (
                    myTrips.map((trip) => (
                      <div key={trip.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-lg p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold">{trip.destination}</h3>
                          <p className="text-sm text-gray-500">{trip.date}</p>
                        </div>
                        <button onClick={() => handleDeleteTrip(trip.id)} className="text-red-400 hover:text-red-600 text-sm">刪除</button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {myFavorites.length === 0 ? (
                    <p className="text-gray-500 text-center py-10 col-span-full">{t.dashboard.noFavorites}</p>
                  ) : (
                    myFavorites.map((wish) => {
                      // 🎨 純 UI：模擬狀態和收藏功能
                      const mockStatus = wish.status || 'pending';
                      const isLiked = likedWishes[wish.id] !== undefined ? likedWishes[wish.id] : true; // 預設已收藏
                      
                      const getStatusStyle = (status: string) => {
                        switch(status) {
                          case 'in_progress': return 'bg-blue-100 text-blue-700';
                          case 'done': return 'bg-orange-100 text-orange-700';
                          default: return 'bg-gray-100 text-gray-600';
                        }
                      };
                      const getStatusText = (status: string) => {
                        switch(status) {
                          case 'in_progress': return '進行中';
                          case 'done': return '已完成';
                          default: return '待處理';
                        }
                      };

                      return (
                      <div key={wish.id} className="group border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden bg-white">
                        <Link href={`/wish/${wish.id}`} className="block">
                          <div className="h-32 bg-gray-100 relative">
                            {wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">🎁</div>}
                            {/* ✨ 收藏按鈕（純 UI） */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLikedWishes(prev => ({ ...prev, [wish.id]: !isLiked }));
                              }}
                              className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "#f97316" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke={isLiked ? "#f97316" : "#9ca3af"} className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                              </svg>
                            </button>
                          </div>
                        </Link>
                        <div className="p-3">
                          <Link href={`/wish/${wish.id}`}>
                            <h4 className="font-bold text-gray-800 line-clamp-1 mb-2">{wish.title}</h4>
                          </Link>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-blue-600 font-bold text-sm">${wish.budget}</p>
                            {/* ✨ 狀態標籤（純 UI） */}
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyle(mockStatus)}`}>
                              {getStatusText(mockStatus)}
                            </span>
                          </div>
                          {/* ✨ 「私訊接單」主按鈕（橘色，純 UI） */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              
                              // 🔍 Debug：輸出完整願望物件
                              console.log('🎁 [DEBUG] Dashboard Wish 完整資料:', wish);
                              console.log('🎁 [DEBUG] wish.buyer_id:', wish.buyer_id);
                              
                              // 檢查 buyer_id 是否有效
                              const targetUserId = wish.buyer_id;
                              const isValidUUID = targetUserId && 
                                               targetUserId !== '00000000-0000-0000-0000-000000000000' &&
                                               targetUserId.length > 10;
                              
                              if (!isValidUUID) {
                                console.error('❌ buyer_id 無效或為全 0 UUID:', targetUserId);
                                alert('無法開啟聊天：發布者 ID 無效');
                                return;
                              }
                              
                              console.log('✅ 跳轉到聊天頁面，目標用戶:', targetUserId);
                              // 🔐 P0-2：傳入來源上下文
                              const chatUrl = `/chat?target=${targetUserId}&source_type=wish_request&source_id=${wish.id}&source_title=${encodeURIComponent(wish.title || '')}`;
                              // ✅ 使用 navigateWithOneReload 確保跳轉後資料正確
                              navigateWithOneReload(router, chatUrl, `chat:wish:${wish.id}`);
                            }}
                            className="flex items-center justify-center gap-1.5 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition shadow-sm text-xs"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>私訊接單</span>
                          </button>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {myOrders.length === 0 ? (
                    <EmptyState 
                      icon="📦" 
                      title="沒有訂單記錄"
                      description="你目前沒有任何訂單，開始接單或發布需求來建立第一筆訂單吧！"
                    />
                  ) : (
                    myOrders.map((order) => {
                      const isBuyer = user.id === order.buyer_id;
                      return (
                        <div
                          key={order.id}
                          className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md transition bg-white relative"
                        >
                          <div className="flex gap-4 flex-grow">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                              {order.wish_requests?.images?.[0] ? (
                                <img src={order.wish_requests.images[0]} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">🎁</div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-gray-800">{order.wish_requests?.title || '已刪除需求'}</h4>
                              <p className="text-sm text-gray-500">
                                {/* Fix: safe access with fallback */}
                                {isBuyer ? `代購：${order.profiles?.name || '未知'}` : `買家：${order.buyer_profile?.name || '未知'}`}
                              </p>
                              <p className="text-sm font-bold text-blue-600 mt-1">${order.price || 0}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 min-w-[120px]">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold 
                              ${
                                order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : order.status === 'accepted'
                                    ? 'bg-blue-100 text-blue-700'
                                    : order.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {order.status === 'pending'
                                ? '待確認'
                                : order.status === 'accepted'
                                  ? '進行中'
                                  : order.status === 'completed'
                                    ? '已完成'
                                    : order.status}
                            </span>

                            {isBuyer && order.status === 'pending' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'accepted', order.wish_id)}
                                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700"
                              >
                                確認委託
                              </button>
                            )}

                            {order.status === 'accepted' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'completed', order.wish_id)}
                                className="border border-green-600 text-green-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-green-50"
                              >
                                完成訂單
                              </button>
                            )}

                            {order.status === 'completed' && (
                              <>
                                {/* 🎨 Uber 式評價按鈕（假資料模擬狀態） */}
                                {(() => {
                                  const targetId = isBuyer ? order.shopper_id : order.buyer_id;
                                  // Fix: safe access with fallback for target name
                                  const targetName = isBuyer ? (order.profiles?.name || '代購') : (order.buyer_profile?.name || '買家');
                                  // 🎨 純 UI：假設部分訂單已評價（模擬）
                                  const hasReviewed = order.id?.endsWith('1') || false; // Fix: safe string method call
                                  
                                  return hasReviewed ? (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      已評價
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setReviewModal({
                                          open: true,
                                          orderId: order.id,
                                          targetId,
                                          targetName: targetName || '對方',
                                        });
                                      }}
                                      className="text-sm bg-orange-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-orange-600 transition"
                                    >
                                      評價
                                    </button>
                                  );
                                })()}
                              </>
                            )}

                            {(order.status === 'completed' || order.status === 'cancelled') && (
                              <button
                                onClick={() => handleArchiveOrder(order)}
                                className="text-gray-400 hover:text-gray-600 p-1 mt-1 transition text-xs flex items-center gap-1"
                                title="從列表隱藏"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                                隱藏訂單
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <ReviewSection />
              )}
            </div>
          </main>
        </div>
      </div>

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
                    {/* Fix: safe file access */}
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAvatarFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">點擊更換頭貼</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">自我介紹</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                  rows={4}
                  placeholder="介紹一下你自己..."
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

      {reviewModal?.open && (
        <ReviewModal
          orderId={reviewModal.orderId}
          targetId={reviewModal.targetId}
          targetName={reviewModal.targetName}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

// EmptyState 已統一使用 components/EmptyState.tsx
