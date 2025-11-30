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
  const [activeTab, setActiveTab] = useState<'wishes' | 'trips' | 'favorites'>('wishes');
  
  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 抓許願
      const { data: wishes } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      setMyWishes(wishes || []);

      // 抓行程
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('shopper_id', user.id)
        .order('created_at', { ascending: false });
      setMyTrips(trips || []);

      // 抓收藏
      const { data: favs } = await supabase
        .from('favorites')
        .select(`wish_id, wish_requests (*)`)
        .eq('user_id', user.id);
      
      if (favs) {
        setMyFavorites(favs.map((f: any) => f.wish_requests).filter(Boolean));
      }

      setLoading(false);
    }
    initData();
  }, [router]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">載入會員資料...</div>;

  // 定義選單按鈕樣式 (共用函式)
  const MenuButton = ({ id, icon, label }: { id: typeof activeTab, icon: string, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 
        ${activeTab === id 
          ? 'bg-blue-600 text-white shadow-md font-medium' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8 px-2">{t.dashboard.title}</h1>

        {/* 這裡開始改成 Grid 佈局：左邊 1 欄，右邊 3 欄 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* =========== 左側：側邊選單 =========== */}
          <aside className="md:col-span-1 space-y-6">
            
            {/* 1. 用戶小卡片 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                {user.email?.[0].toUpperCase()}
              </div>
              <p className="font-bold text-gray-800 truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 mb-4">{user.email}</p>
              
              <Link 
                href={`/profile/${user.id}`}
                className="block w-full py-2 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50 transition"
              >
                {t.dashboard.viewProfile}
              </Link>
            </div>

            {/* 2. 選單按鈕區 */}
            <nav className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-1">
              <MenuButton id="wishes" icon="🎁" label={t.dashboard.myWishes} />
              <MenuButton id="trips" icon="✈️" label={t.dashboard.myTrips} />
              <MenuButton id="favorites" icon="❤️" label={t.dashboard.myFavorites} />
            </nav>

          </aside>


          {/* =========== 右側：內容顯示區 =========== */}
          <main className="md:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
              
              {/* 標題 */}
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                {activeTab === 'wishes' && `🎁 ${t.dashboard.myWishes}`}
                {activeTab === 'trips' && `✈️ ${t.dashboard.myTrips}`}
                {activeTab === 'favorites' && `❤️ ${t.dashboard.myFavorites}`}
              </h2>

              {/* 內容：我的許願 */}
              {activeTab === 'wishes' && (
                <div className="space-y-4">
                  {myWishes.length === 0 ? <EmptyState text={t.dashboard.noWishes} /> : 
                    myWishes.map(wish => (
                      <div key={wish.id} className="group border border-gray-100 rounded-lg p-4 flex justify-between items-center hover:shadow-sm transition hover:border-blue-200">
                        <Link href={`/wish/${wish.id}`} className="flex-grow">
                          <h4 className="font-bold text-gray-800 group-hover:text-blue-600">{wish.title}</h4>
                          <span className="text-sm text-gray-500">${wish.budget.toLocaleString()} • {wish.target_country}</span>
                        </Link>
                        <button onClick={() => handleDeleteWish(wish.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* 內容：我的行程 */}
              {activeTab === 'trips' && (
                <div className="space-y-4">
                  {myTrips.length === 0 ? <EmptyState text={t.dashboard.noTrips} /> : 
                    myTrips.map(trip => (
                      <div key={trip.id} className="relative border border-gray-100 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-sm transition bg-white overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                        <div className="pl-2">
                          <h3 className="font-bold text-lg text-gray-800">{trip.destination}</h3>
                          <p className="text-sm text-gray-500 mt-1">📅 出發：{trip.date}</p>
                          <p className="text-xs text-gray-400 mt-2 line-clamp-1">{trip.description}</p>
                        </div>
                        <button onClick={() => handleDeleteTrip(trip.id)} className="mt-4 sm:mt-0 text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">
                          刪除行程
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* 內容：我的收藏 */}
              {activeTab === 'favorites' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myFavorites.length === 0 ? <EmptyState text={t.dashboard.noFavorites} /> : 
                    myFavorites.map(wish => (
                      <Link key={wish.id} href={`/wish/${wish.id}`} className="block border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden group">
                        <div className="h-32 bg-gray-100 relative">
                           {wish.images && wish.images[0] ? (
                             <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                           ) : <div className="flex items-center justify-center h-full text-2xl">🎁</div>}
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600">{wish.title}</h4>
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
    </div>
  );
}

// 沒資料時的顯示元件
const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <span className="text-4xl mb-4 opacity-30">📂</span>
    <p>{text}</p>
  </div>
);