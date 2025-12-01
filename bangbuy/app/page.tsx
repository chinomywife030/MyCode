'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';
import IntroModal from '@/components/IntroModal';
import OfferModal from '@/components/OfferModal';

export default function Home() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [myOrders, setMyOrders] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeWishForOffer, setActiveWishForOffer] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const [wishesRes, tripsRes] = await Promise.all([
        supabase.from('wish_requests').select('*, profiles:buyer_id(name, avatar_url)').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('trips').select('*, profiles:shopper_id(name, avatar_url)').order('created_at', { ascending: false })
      ]);

      setWishes(wishesRes.data || []);
      setTrips(tripsRes.data || []);

      if (user) {
        const { data: favData } = await supabase.from('favorites').select('wish_id').eq('user_id', user.id);
        if (favData) setMyFavorites(favData.map(f => f.wish_id));
        const { data: orderData } = await supabase.from('orders').select('wish_id').eq('shopper_id', user.id);
        if (orderData) setMyOrders(orderData.map(o => o.wish_id));
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

  const openOfferModal = (e: React.MouseEvent, wish: any) => {
    e.preventDefault();
    if (!currentUser) return alert('請先登入才能接單喔！');
    if (currentUser.id === wish.buyer_id) return alert('不能接自己的單啦 😂');
    setActiveWishForOffer(wish);
  };

  const handleConfirmOffer = async (price: number) => {
    if (!activeWishForOffer) return;
    const { error } = await supabase.from('orders').insert([{ wish_id: activeWishForOffer.id, buyer_id: activeWishForOffer.buyer_id, shopper_id: currentUser.id, price: price, status: 'pending' }]);
    if (error) { alert('接單失敗：' + error.message); } 
    else {
      alert('🎉 報價已送出！請等待買家確認。');
      setMyOrders(prev => [...prev, activeWishForOffer.id]);
      setActiveWishForOffer(null);
    }
  };

  const getFlag = (code: string) => {
    const flags: Record<string, string> = { JP: '🇯🇵', KR: '🇰🇷', US: '🇺🇸', UK: '🇬🇧', TW: '🇹🇼' };
    return flags[code] || code;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 selection:bg-blue-100">
      <IntroModal />
      <RoleSelectorModal />
      {activeWishForOffer && <OfferModal wish={activeWishForOffer} onClose={() => setActiveWishForOffer(null)} onConfirm={handleConfirmOffer} />}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* ✨ Hero Section: 更精緻的漸層與陰影 */}
        <div className={`relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 mb-12 sm:mb-16 shadow-2xl transition-all duration-500
          ${mode === 'requester' 
            ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-blue-200' 
            : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 shadow-orange-200'}
        `}>
          {/* 背景裝飾圓圈 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-white drop-shadow-sm">
              {mode === 'requester' ? '👋 嗨，買家！找人幫你買？' : '👋 嗨，代購夥伴！想接單嗎？'}
            </h2>
            <p className="text-white/90 mb-8 text-lg sm:text-xl max-w-2xl leading-relaxed font-medium">
              {mode === 'requester' 
                ? '瀏覽下方即將出發的留學生行程，直接委託他們，或者發布你的許願單！' 
                : '瀏覽下方的許願清單，看看大家想要什麼，順路幫帶賺旅費！'}
            </p>
            <Link href={mode === 'requester' ? '/create' : '/trips/create'} 
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 text-base sm:text-lg group"
            >
              <span>{mode === 'requester' ? '＋ 發布許願單' : '＋ 發布我的行程'}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {mode === 'requester' ? (
          <div>
            <div className="mb-8 pl-2">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
                ✈️ 這些人準備要出發
              </h2>
              <p className="text-gray-500 font-medium">把握機會，直接私訊他們幫忙帶貨！</p>
            </div>

            {loading ? <p className="text-gray-400 text-lg py-20 text-center animate-pulse">正在搜尋航班...</p> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {trips.map((trip) => (
                  <div key={trip.id} className="group bg-white p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 text-9xl pointer-events-none">✈️</div>
                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm shadow-blue-200">🚀 即將出發</span>
                        <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full">📅 {trip.date}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black mb-3 text-gray-900">{trip.destination}</h3>
                      <p className="text-gray-600 text-base leading-relaxed mb-6 line-clamp-2">{trip.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                        <Link href={`/profile/${trip.shopper_id}`} className="flex items-center gap-3 group/profile hover:bg-gray-50 p-2 rounded-xl transition -ml-2">
                          <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden ring-2 ring-white shadow-md">
                             {trip.profiles?.avatar_url ? <img src={trip.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">{trip.shopper_name?.[0]}</div>}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-medium">代購夥伴</p>
                            <span className="text-sm font-bold text-gray-800 group-hover/profile:text-blue-600 transition">{trip.shopper_name || trip.profiles?.name}</span>
                          </div>
                        </Link>
                        <Link href={`/chat?target=${trip.shopper_id}`} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black shadow-md hover:shadow-lg transition-all active:scale-95">
                          私訊委託
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (

          <div>
            <div className="mb-8 pl-2">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
                🎁 這裡有訂單可以接
              </h2>
              <p className="text-gray-500 font-medium">順路幫買，賺取額外旅費！</p>
            </div>
            
            {loading ? <p className="text-gray-400 text-lg py-20 text-center animate-pulse">正在整理願望...</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {wishes.map((wish) => {
                  const hasOffered = myOrders.includes(wish.id); 
                  return (
                    // ✨ 卡片樣式升級：更圓潤、陰影更柔和
                    <div key={wish.id} className="group relative bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 border border-gray-100 hover:border-orange-200 h-full flex flex-col overflow-hidden hover:-translate-y-1">
                      
                      {/* 圖片區 */}
                      <Link href={`/wish/${wish.id}`} className="h-52 bg-gray-50 relative w-full overflow-hidden block">
                        {wish.images?.[0] ? (
                          <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100 text-gray-300">🎁</div>
                        )}
                        {/* 國旗標籤 */}
                        <div className="absolute top-4 left-4">
                           <span className="backdrop-blur-md bg-white/90 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-white/50">
                             {getFlag(wish.target_country)} {wish.target_country}
                           </span>
                        </div>
                        {/* 愛心按鈕 */}
                        <button onClick={(e) => toggleFavorite(e, wish.id)} className={`absolute top-4 right-4 p-2.5 rounded-full transition shadow-sm backdrop-blur-md ${myFavorites.includes(wish.id) ? 'bg-white text-red-500 shadow-red-100' : 'bg-black/20 text-white hover:bg-white hover:text-red-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        </button>
                      </Link>

                      <div className="p-6 flex flex-col flex-grow">
                        <div className="mb-4">
                          <span className="block text-2xl font-black text-gray-900 mb-1 tracking-tight">${Number(wish.budget).toLocaleString()}</span>
                          <Link href={`/wish/${wish.id}`}>
                            <h3 className="font-bold text-lg text-gray-700 line-clamp-2 group-hover:text-orange-600 transition-colors cursor-pointer">{wish.title}</h3>
                          </Link>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                           <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden ring-1 ring-gray-100">
                             {wish.profiles?.avatar_url ? <img src={wish.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100"></div>}
                           </div>
                           <span className="text-xs font-bold text-gray-500">{wish.profiles?.name}</span>
                        </div>

                        <div className="w-full mt-auto flex gap-3">
                          <Link href={`/chat?target=${wish.buyer_id}`} className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 hover:text-gray-900 transition text-center block">
                            💬 私訊
                          </Link>
                          
                          <button 
                            onClick={(e) => openOfferModal(e, wish)}
                            disabled={hasOffered || currentUser?.id === wish.buyer_id}
                            className={`flex-[2] py-3 rounded-xl text-sm font-bold transition shadow-sm hover:shadow-md text-center block text-white
                              ${hasOffered ? 'bg-green-500 cursor-default' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}
                          >
                            {hasOffered ? '✅ 已報價' : '💰 報價接單'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}