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
import Calculator from '@/components/Calculator'; // 👈 引入計算機元件
import { sendOfferNotification } from '@/app/actions';

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

  // 搜尋與篩選
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const [wishesRes, tripsRes] = await Promise.all([
        supabase.from('wish_requests').select('*, profiles:buyer_id(name, avatar_url, rating_avg, rating_count, verification_status)').eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('trips').select('*, profiles:shopper_id(name, avatar_url, rating_avg, rating_count, verification_status)').order('created_at', { ascending: false })
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
    e.preventDefault(); e.stopPropagation();
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
      sendOfferNotification(activeWishForOffer.title, activeWishForOffer.buyer_id, price);
      setActiveWishForOffer(null);
    }
  };

  const getFlag = (code: string) => {
    const flags: Record<string, string> = { JP: '🇯🇵', KR: '🇰🇷', US: '🇺🇸', UK: '🇬🇧', TW: '🇹🇼' };
    return flags[code] || code;
  };

  const isNew = (dateString: string) => (new Date().getTime() - new Date(dateString).getTime()) < 86400000 * 2;
  const isUrgent = (deadline: string) => deadline && (new Date(deadline).getTime() - new Date().getTime()) < 86400000 * 7;

  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      if (sortBy === 'price_asc') return (a.budget || 0) - (b.budget || 0);
      if (sortBy === 'price_desc') return (b.budget || 0) - (a.budget || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filteredWishes = sortData(wishes.filter(wish => {
    const matchSearch = wish.title.toLowerCase().includes(searchTerm.toLowerCase()) || wish.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || wish.category === selectedCategory;
    const matchCountry = selectedCountry === 'all' || wish.target_country === selectedCountry;
    return matchSearch && matchCategory && matchCountry;
  }));

  const filteredTrips = sortData(trips.filter(trip => {
     return trip.destination.toLowerCase().includes(searchTerm.toLowerCase()) || trip.description.toLowerCase().includes(searchTerm.toLowerCase());
  }));

  const RatingBadge = ({ rating, count, verified }: { rating: number, count: number, verified: string }) => (
    <div className="flex items-center gap-2">
      {verified === 'verified' && <span className="text-blue-500 bg-blue-50 rounded-full p-0.5" title="已認證"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg></span>}
      {!count ? <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">新用戶</span> : <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">★ {rating.toFixed(1)} <span className="text-gray-400 font-normal">({count})</span></span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 selection:bg-blue-100">
      <IntroModal />
      <RoleSelectorModal />
      {activeWishForOffer && <OfferModal wish={activeWishForOffer} onClose={() => setActiveWishForOffer(null)} onConfirm={handleConfirmOffer} />}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 🔥 Hero Section: 橫跨全版 */}
        <div className={`relative overflow-hidden rounded-[2rem] p-8 sm:p-12 mb-10 shadow-2xl transition-all duration-500 ${mode === 'requester' ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-blue-200' : 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 shadow-orange-200'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight text-white drop-shadow-sm">{mode === 'requester' ? '👋 嗨，買家！找人幫你買？' : '👋 嗨，代購夥伴！想接單嗎？'}</h2>
            <p className="text-white/90 mb-8 text-lg sm:text-xl max-w-2xl leading-relaxed font-medium">{mode === 'requester' ? '瀏覽下方即將出發的留學生行程，直接委託他們，或者發布你的許願單！' : '瀏覽下方的許願清單，看看大家想要什麼，順路幫帶賺旅費！'}</p>
            <Link href={mode === 'requester' ? '/create' : '/trips/create'} className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 text-base sm:text-lg group">
              <span>{mode === 'requester' ? '＋ 發布許願單' : '＋ 發布我的行程'}</span><span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* 🔥 新增：左右兩欄佈局 (Desktop Only) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左欄：搜尋與列表 (佔 8 格) */}
          <div className="lg:col-span-8">
             {/* 搜尋列 */}
             <div className="mb-8 space-y-4 sticky top-20 z-40 bg-gray-50/95 backdrop-blur-sm p-4 -mx-4 sm:mx-0 rounded-2xl border border-gray-100/50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                  <input type="text" placeholder={mode === 'requester' ? "搜尋行程目的地..." : "搜尋商品名稱..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
                </div>
                <div className="flex gap-2">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-200 shadow-sm bg-white cursor-pointer">
                    <option value="newest">🕒 最新</option>
                    {mode === 'shopper' && (<><option value="price_asc">💲 價格低→高</option><option value="price_desc">💲 價格高→低</option></>)}
                  </select>
                  {mode === 'shopper' && (
                    <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-200 shadow-sm bg-white cursor-pointer">
                      <option value="all">🌍 全球</option><option value="JP">🇯🇵 日本</option><option value="KR">🇰🇷 韓國</option><option value="US">🇺🇸 美國</option><option value="UK">🇬🇧 英國</option><option value="TW">🇹🇼 台灣</option>
                    </select>
                  )}
                </div>
              </div>
              {mode === 'shopper' && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['all', 'food', 'beauty', 'clothes', 'digital', 'other'].map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border-gray-200'}`}>{cat === 'all' ? '全部' : cat}</button>
                  ))}
                </div>
              )}
             </div>

             {/* 列表內容 (這段邏輯不變，只是搬進了左欄) */}
             {mode === 'requester' ? (
               /* 行程列表 (Trips) - 程式碼與之前相同，省略重複部分以節省空間 */
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ... 這裡放 trips.map 的內容 ... */}
                  {filteredTrips.length === 0 ? <div className="col-span-full text-center py-20 text-gray-400">沒有找到行程</div> : filteredTrips.map((trip) => (
                     <div key={trip.id} className="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 transition-all hover:-translate-y-1 relative overflow-hidden">
                       {/* ... Card Content ... */}
                       <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl pointer-events-none">✈️</div>
                       <div className="relative z-10">
                         <div className="flex flex-wrap items-center gap-3 mb-3">
                           {isNew(trip.created_at) && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">NEW</span>}
                           <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold">🚀 出發</span>
                           <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded">📅 {trip.date}</span>
                         </div>
                         <h3 className="text-xl font-black mb-2 text-gray-900">{trip.destination}</h3>
                         <p className="text-gray-600 text-sm mb-4 line-clamp-2">{trip.description}</p>
                         <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                            <Link href={`/profile/${trip.shopper_id}`} className="flex items-center gap-2 group/profile hover:bg-gray-50 p-1 rounded-lg transition -ml-1">
                              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                                {trip.profiles?.avatar_url ? <img src={trip.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs">{trip.shopper_name?.[0]}</div>}
                              </div>
                              <div><span className="text-xs font-bold text-gray-800 block">{trip.shopper_name}</span><RatingBadge rating={trip.profiles?.rating_avg} count={trip.profiles?.rating_count} verified={trip.profiles?.verification_status} /></div>
                            </Link>
                            <Link href={`/chat?target=${trip.shopper_id}`} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black shadow-md">私訊</Link>
                         </div>
                       </div>
                     </div>
                  ))}
               </div>
             ) : (
               /* 許願列表 (Wishes) */
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ... 這裡放 wishes.map 的內容 ... */}
                  {filteredWishes.length === 0 ? <div className="col-span-full text-center py-20 text-gray-400">沒有找到許願單</div> : filteredWishes.map((wish) => {
                    const hasOffered = myOrders.includes(wish.id);
                    return (
                      <div key={wish.id} className="group bg-white rounded-[1.5rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1">
                        <Link href={`/wish/${wish.id}`} className="h-48 bg-gray-50 relative w-full overflow-hidden block">
                          {wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100 text-gray-300">🎁</div>}
                          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                             <span className="backdrop-blur-md bg-white/90 text-gray-900 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-white/50">{getFlag(wish.target_country)} {wish.target_country}</span>
                             {isUrgent(wish.deadline) && <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow-md animate-pulse">⏳ 急單</span>}
                             {isNew(wish.created_at) && <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow-md">NEW</span>}
                          </div>
                          <button onClick={(e) => toggleFavorite(e, wish.id)} className={`absolute top-3 right-3 p-2 rounded-full transition shadow-sm backdrop-blur-md ${myFavorites.includes(wish.id) ? 'bg-white text-red-500' : 'bg-black/20 text-white hover:bg-white hover:text-red-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg></button>
                        </Link>
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="mb-3">
                            <span className="block text-xl font-black text-gray-900 mb-1 tracking-tight">${Number(wish.budget).toLocaleString()}</span>
                            <Link href={`/wish/${wish.id}`}><h3 className="font-bold text-base text-gray-700 line-clamp-2 group-hover:text-orange-600 transition-colors cursor-pointer">{wish.title}</h3></Link>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                             <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden">
                               {wish.profiles?.avatar_url ? <img src={wish.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-blue-100"></div>}
                             </div>
                             <span className="text-xs font-bold text-gray-500">{wish.profiles?.name}</span>
                             <RatingBadge rating={wish.profiles?.rating_avg} count={wish.profiles?.rating_count} verified={wish.profiles?.verification_status} />
                          </div>
                          <div className="w-full mt-auto flex gap-2">
                            <Link href={`/chat?target=${wish.buyer_id}`} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition text-center block">💬 私訊</Link>
                            <button onClick={(e) => openOfferModal(e, wish)} disabled={hasOffered || currentUser?.id === wish.buyer_id} className={`flex-[2] py-2 rounded-lg text-xs font-bold transition shadow-sm text-center block text-white ${hasOffered ? 'bg-green-500 cursor-default' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}>{hasOffered ? '✅ 已報價' : '💰 報價'}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
             )}
          </div>

          {/* 右欄：固定計算機 (佔 4 格，只在電腦顯示) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              
              {/* 1. 計算機 Widget */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white">
                  <h3 className="font-bold flex items-center gap-2">
                    🧮 快速試算工具
                  </h3>
                  <p className="text-xs opacity-80">即時匯率換算，掌握成本。</p>
                </div>
                {/* 這裡直接引用 Calculator 元件，但為了讓它適應 Sidebar，可能需要微調樣式，或者直接用 */}
                <div className="p-0 scale-90 origin-top -mb-4">
                   <Calculator />
                </div>
              </div>

              {/* 2. 廣告 / 推廣區塊 (範例) */}
              <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 text-center">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="font-bold text-orange-800 mb-1">成為認證代購</h3>
                <p className="text-sm text-orange-600 mb-4">上傳學生證，獲得藍勾勾，接單率提升 200%！</p>
                <Link href="/verify" className="block w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition">
                  立即認證
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}