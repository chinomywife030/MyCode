'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';
import IntroModal from '@/components/IntroModal';
import OfferModal from '@/components/OfferModal'; // 👈 1. 引入新元件

export default function Home() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [myOrders, setMyOrders] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 👈 2. 新增：控制報價彈窗的狀態
  const [activeWishForOffer, setActiveWishForOffer] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const [wishesRes, tripsRes] = await Promise.all([
        supabase
          .from('wish_requests')
          .select('*, profiles:buyer_id(name, avatar_url)')
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('trips')
          .select('*, profiles:shopper_id(name, avatar_url)')
          .order('created_at', { ascending: false })
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

  // 👈 3. 修改：點擊按鈕只負責打開彈窗
  const openOfferModal = (e: React.MouseEvent, wish: any) => {
    e.preventDefault();
    if (!currentUser) return alert('請先登入才能接單喔！');
    if (currentUser.id === wish.buyer_id) return alert('不能接自己的單啦 😂');
    setActiveWishForOffer(wish); // 設定當前要報價的許願單
  };

  // 👈 4. 新增：真正執行送出報價的函式 (給 Modal 用的)
  const handleConfirmOffer = async (price: number) => {
    if (!activeWishForOffer) return;

    const { error } = await supabase.from('orders').insert([
      {
        wish_id: activeWishForOffer.id,
        buyer_id: activeWishForOffer.buyer_id,
        shopper_id: currentUser.id,
        price: price,
        status: 'pending'
      }
    ]);

    if (error) {
      alert('接單失敗：' + error.message);
    } else {
      alert('🎉 報價已送出！請等待買家確認。\n您可以到「會員中心 > 我的訂單」查看進度。');
      setMyOrders(prev => [...prev, activeWishForOffer.id]);
      setActiveWishForOffer(null); // 關閉彈窗
    }
  };

  const getFlag = (code: string) => {
    const flags: Record<string, string> = { JP: '🇯🇵', KR: '🇰🇷', US: '🇺🇸', UK: '🇬🇧', TW: '🇹🇼' };
    return flags[code] || code;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <IntroModal />
      <RoleSelectorModal />
      
      {/* 👈 5. 渲染報價彈窗 (如果有選中許願單的話) */}
      {activeWishForOffer && (
        <OfferModal 
          wish={activeWishForOffer} 
          onClose={() => setActiveWishForOffer(null)} 
          onConfirm={handleConfirmOffer} 
        />
      )}

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

        {mode === 'requester' ? (
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">✈️ 這些人準備要出發</h2>
                <p className="text-gray-500 text-sm">把握機會，直接私訊他們幫忙帶貨！</p>
              </div>
            </div>

            {loading ? <p className="text-gray-500 text-lg py-10 text-center">正在搜尋航班...</p> : (
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
            
            {loading ? <p className="text-gray-500 text-lg py-10 text-center">正在整理願望...</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishes.map((wish) => {
                  const hasOffered = myOrders.includes(wish.id); 
                  
                  return (
                    <div key={wish.id} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-orange-200 h-full flex flex-col transform hover:-translate-y-1">
                      
                      <Link href={`/wish/${wish.id}`} className="h-56 bg-gray-50 relative w-full overflow-hidden flex justify-center items-center cursor-pointer block">
                        {wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/> : <div className="text-6xl opacity-20">🎁</div>}
                      </Link>

                      <button onClick={(e) => toggleFavorite(e, wish.id)} className={`absolute top-3 right-3 p-2.5 rounded-full transition shadow-sm backdrop-blur-sm z-10 ${myFavorites.includes(wish.id) ? 'bg-white text-red-500 shadow-red-100' : 'bg-black/20 text-white hover:bg-white hover:text-red-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      </button>

                      <div className="absolute top-3 left-3 z-10 pointer-events-none">
                         <span className="backdrop-blur-md bg-white/80 text-gray-800 text-sm font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                           {getFlag(wish.target_country)} {wish.target_country}
                         </span>
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <div className="mb-3">
                          <span className="block text-2xl font-extrabold text-gray-900 mb-1">${Number(wish.budget).toLocaleString()}</span>
                          <Link href={`/wish/${wish.id}`}>
                            <h3 className="font-bold text-lg text-gray-700 line-clamp-2 group-hover:text-orange-600 transition-colors cursor-pointer">{wish.title}</h3>
                          </Link>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                             {wish.profiles?.avatar_url ? <img src={wish.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100"></div>}
                           </div>
                           <span className="text-xs text-gray-500">{wish.profiles?.name}</span>
                        </div>

                        <div className="w-full mt-auto flex gap-2">
                          <Link href={`/chat?target=${wish.buyer_id}`} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-base font-bold hover:bg-gray-200 transition text-center block">
                            💬 私訊
                          </Link>
                          
                          <button 
                            // 👈 6. 修改：點擊後打開彈窗，而不是直接 prompt
                            onClick={(e) => openOfferModal(e, wish)}
                            disabled={hasOffered || currentUser?.id === wish.buyer_id}
                            className={`flex-[2] py-3 rounded-xl text-base font-bold transition shadow-sm hover:shadow-md text-center block text-white
                              ${hasOffered ? 'bg-green-500 cursor-default' : 'bg-orange-500 hover:bg-orange-600'}`}
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