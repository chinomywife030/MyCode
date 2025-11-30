'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider'; // 1. 引入模式管家
import RoleSelectorModal from '@/components/RoleSelectorModal'; // 2. 引入彈窗

export default function Home() {
  const { t } = useLanguage();
  const { mode } = useUserMode(); // 3. 取得目前模式 (requester 或 shopper)
  
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 4. 一次把「許願」跟「行程」都抓下來 (這樣切換時不用重抓，速度快)
      const [wishesRes, tripsRes] = await Promise.all([
        supabase.from('wish_requests').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('trips').select('*').order('created_at', { ascending: false })
      ]);

      setWishes(wishesRes.data || []);
      setTrips(tripsRes.data || []);

      if (user) {
        const { data: favData } = await supabase.from('favorites').select('wish_id').eq('user_id', user.id);
        if (favData) setMyFavorites(favData.map(f => f.wish_id));
      }
      
      setLoading(false);
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
      
      {/* 第一次進來會跳出的詢問視窗 */}
      <RoleSelectorModal />
      
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 5. 根據模式顯示不同的 Banner (藍色 vs 橘色) */}
        <div className={`rounded-2xl p-8 mb-8 shadow-lg text-white transition-colors duration-500
          ${mode === 'requester' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'}
        `}>
          <h2 className="text-3xl font-bold mb-2">
            {mode === 'requester' ? '👋 嗨，買家！想要什麼？' : '👋 嗨，代購夥伴！準備出發嗎？'}
          </h2>
          <p className="opacity-90 mb-6 text-lg">
            {mode === 'requester' 
              ? '這裡有數百位留學生準備出發，發布許願單，讓他們幫你帶回來！' 
              : '看看大家都想要什麼，順路幫帶賺旅費，或者發布你的行程！'}
          </p>
          
          <Link 
            href={mode === 'requester' ? '/create' : '/trips/create'}
            className="inline-block bg-white text-gray-900 px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition"
          >
            {mode === 'requester' ? '＋ 發布許願單' : '＋ 發布我的行程'}
          </Link>
        </div>

        {/* 6. 核心內容切換區 */}
        {mode === 'requester' ? (
          
          // ========= A. 買家模式：顯示許願牆 =========
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              🎁 大家都在許願
            </h2>
            
            {loading ? <p className="text-gray-500">載入中...</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishes.map((wish) => (
                  <Link key={wish.id} href={`/wish/${wish.id}`} className="block group relative">
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 h-full flex flex-col">
                      <div className="h-48 bg-gray-100 relative w-full overflow-hidden">
                        {wish.images?.[0] ? (
                          <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                        ) : <div className="flex items-center justify-center h-full text-4xl">🎁</div>}
                        
                        {/* 愛心按鈕 */}
                        <button onClick={(e) => toggleFavorite(e, wish.id)} className={`absolute top-2 right-2 p-2 rounded-full transition shadow-sm ${myFavorites.includes(wish.id) ? 'bg-white text-red-500' : 'bg-black/30 text-white hover:bg-white hover:text-red-300'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{getFlag(wish.target_country)}</span>
                          <span className="font-bold text-gray-900">${wish.budget}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 line-clamp-1">{wish.title}</h3>
                        <button className="w-full mt-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition">✋ 幫忙買</button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        ) : (

          // ========= B. 留學生模式：顯示行程牆 =========
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              ✈️ 誰準備要出發？
            </h2>

            {loading ? <p className="text-gray-500">載入中...</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trips.map((trip) => (
                  <div key={trip.id} className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">即將出發</span>
                        <span className="text-gray-500 text-sm">📅 {trip.date}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-1 text-gray-800">{trip.destination}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-1">{trip.description}</p>
                      
                      <Link href={`/profile/${trip.shopper_id}`} className="flex items-center gap-2 group w-fit">
                        <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden">
                           <img src="https://via.placeholder.com/150" className="w-full h-full object-cover opacity-50"/>
                        </div>
                        <span className="text-sm text-gray-500 group-hover:text-orange-600 transition">代購人：{trip.shopper_name}</span>
                      </Link>
                    </div>
                    <button className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 shadow-sm">
                      私訊委託
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}