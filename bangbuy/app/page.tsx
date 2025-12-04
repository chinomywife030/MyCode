'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';

export default function Home() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // 🔽 修改：多抓了 profiles (發文者資料)
        const [wishesRes, tripsRes] = await Promise.all([
          supabase
            .from('wish_requests')
            .select('*, profiles:buyer_id(name, avatar_url)') // 關聯抓取買家資料
            .eq('status', 'open')
            .order('created_at', { ascending: false }),

          supabase
            .from('trips')
            .select('*, profiles:shopper_id(name, avatar_url)') // 關聯抓取留學生資料
            .order('created_at', { ascending: false })
        ]);

        if (wishesRes.error) {
          console.error('Error fetching wishes:', wishesRes.error);
          setError('無法載入許願單：' + wishesRes.error.message);
        }
        if (tripsRes.error) {
          console.error('Error fetching trips:', tripsRes.error);
          setError('無法載入行程：' + tripsRes.error.message);
        }

        setWishes(wishesRes.data || []);
        setTrips(tripsRes.data || []);

        if (user) {
          const { data: favData } = await supabase.from('favorites').select('wish_id').eq('user_id', user.id);
          if (favData) setMyFavorites(favData.map(f => f.wish_id));
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('載入資料時發生錯誤：' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, wishId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return alert('請先登入');
    
    const isFav = myFavorites.includes(wishId);
    if (isFav) {
      setMyFavorites(prev => prev.filter(id => id !== wishId));
      await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('wish_id', wishId);
    } else {
      setMyFavorites(prev => [...prev, wishId]);
      await supabase.from('favorites').insert([{ user_id: currentUser.id, wish_id: wishId }]);
    }
  };

  const getFlag = (code: string) => {
    const flags: Record<string, string> = { JP: '🇯🇵', KR: '🇰🇷', US: '🇺🇸', UK: '🇬🇧', TW: '🇹🇼' };
    return flags[code] || code;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleSelectorModal />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className={`rounded-3xl p-8 mb-10 shadow-xl text-white transition-all duration-500 transform hover:scale-[1.01]
          ${mode === 'requester' ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500' : 'bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400'}
        `}>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
            {mode === 'requester' ? '👋 嗨，買家！找人幫你買？' : '👋 嗨，代購夥伴！想接單嗎？'}
          </h2>
          <p className="opacity-90 mb-8 text-lg sm:text-xl max-w-2xl leading-relaxed">
            {mode === 'requester' 
              ? '瀏覽下方即將出發的留學生行程，直接委託他們，或者發布你的許願單！' 
              : '瀏覽下方的許願清單，看看大家想要什麼，順路幫帶賺旅費！'}
          </p>
          <Link href={mode === 'requester' ? '/create' : '/trips/create'} className="inline-block bg-white text-gray-900 px-8 py-4 rounded-full font-bold shadow-md hover:bg-gray-50 hover:shadow-lg transition-all active:scale-95">
            {mode === 'requester' ? '＋ 發布許願單' : '＋ 發布我的行程'}
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 font-medium">❌ {error}</p>
          </div>
        )}

        {mode === 'requester' ? (
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">✈️ 這些人準備要出發</h2>
                <p className="text-gray-500 text-sm">把握機會，直接私訊他們幫忙帶貨！</p>
              </div>
            </div>

            {loading ? <p className="text-gray-500 text-lg py-10 text-center">正在搜尋航班...</p> : trips.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <div className="text-6xl mb-4">✈️</div>
                <p className="text-gray-500 text-lg">目前沒有即將出發的行程</p>
                <p className="text-gray-400 text-sm mt-2">請稍後再回來查看！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trips.map((trip) => (
                  <div key={trip.id} className="group bg-gradient-to-br from-white to-blue-50 p-6 rounded-2xl shadow-md hover:shadow-xl border border-blue-100 hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 text-blue-100/50 text-8xl font-black rotate-12 pointer-events-none">✈️</div>
                    <div className="flex-grow relative z-10">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">🚀 即將出發</span>
                        <span className="text-blue-800 font-medium text-sm flex items-center gap-1 bg-blue-100/50 px-2 py-1 rounded-md">📅 {trip.date}</span>
                      </div>
                      <h3 className="text-2xl font-extrabold mb-2 text-gray-900 group-hover:text-blue-700 transition-colors">{trip.destination}</h3>
                      <p className="text-gray-600 text-base mb-4 line-clamp-2 leading-relaxed">{trip.description}</p>
                      
                      {/* 🔽 顯示行程發布者的頭像 */}
                      <Link href={`/profile/${trip.shopper_id}`} className="flex items-center gap-3 group/profile w-fit p-2 -ml-2 rounded-lg hover:bg-white/50 transition">
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                           {trip.profiles?.avatar_url ? <img src={trip.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-blue-200 text-blue-600 font-bold">{trip.shopper_name?.[0]}</div>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">代購夥伴</p>
                          <span className="text-sm font-bold text-gray-700 group-hover/profile:text-blue-600 transition">{trip.shopper_name || trip.profiles?.name}</span>
                        </div>
                      </Link>
                    </div>
                    <Link href={`/chat?target=${trip.shopper_id}`} className="relative z-10 w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap text-center block">
                      私訊委託代購
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">🎁 這裡有訂單可以接</h2>

            {loading ? <p className="text-gray-500 text-lg py-10 text-center">正在整理願望...</p> : wishes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <div className="text-6xl mb-4">🎁</div>
                <p className="text-gray-500 text-lg">目前沒有許願單</p>
                <p className="text-gray-400 text-sm mt-2">請稍後再回來查看！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishes.map((wish) => (
                  <Link key={wish.id} href={`/wish/${wish.id}`} className="block group relative">
                    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-orange-200 h-full flex flex-col transform hover:-translate-y-1">
                      <div className="h-56 bg-gray-50 relative w-full overflow-hidden flex justify-center items-center">
                        {wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : <div className="text-6xl opacity-20">🎁</div>}
                        <button onClick={(e) => toggleFavorite(e, wish.id)} className={`absolute top-3 right-3 p-2.5 rounded-full transition shadow-sm backdrop-blur-sm ${myFavorites.includes(wish.id) ? 'bg-white text-red-500 shadow-red-100' : 'bg-black/20 text-white hover:bg-white hover:text-red-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        </button>
                        <div className="absolute top-3 left-3">
                           <span className="backdrop-blur-md bg-white/80 text-gray-800 text-sm font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                             {getFlag(wish.target_country)} {wish.target_country}
                           </span>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="mb-3">
                          <span className="block text-2xl font-extrabold text-gray-900 mb-1">${Number(wish.budget).toLocaleString()}</span>
                          <h3 className="font-bold text-lg text-gray-700 line-clamp-2 group-hover:text-orange-600 transition-colors">{wish.title}</h3>
                        </div>
                        
                        {/* 🔽 顯示許願者的小頭像 */}
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                             {wish.profiles?.avatar_url ? <img src={wish.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100"></div>}
                           </div>
                           <span className="text-xs text-gray-500">{wish.profiles?.name}</span>
                        </div>

                        <Link href={`/chat?target=${wish.buyer_id}`} className="w-full mt-auto py-3 bg-orange-50 text-orange-600 rounded-xl text-base font-bold group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm hover:shadow-md text-center block">
                          ✋ 私訊接單
                        </Link>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}