'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';

type Wish = {
  id: string;
  title: string;
  budget: number;
  target_country: string;
  category: string;
  description: string;
  images: string[];
};

export default function Home() {
  const { t } = useLanguage();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // 🔽 新增：用來存「我收藏了哪些 ID」的清單
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const categoriesList = ['all', 'food', 'beauty', 'clothes', 'digital', 'other'];
  const countriesList = ['JP', 'KR', 'US', 'UK', 'TW'];

  useEffect(() => {
    async function fetchData() {
      // 1. 先抓使用者
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. 抓許願單
      const { data: wishesData, error } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setWishes(wishesData || []);

      // 3. 如果有登入，抓取「我的收藏」
      if (user) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('wish_id')
          .eq('user_id', user.id);
        
        // 把抓回來的資料變成一個簡單的 ID 陣列：['id1', 'id2'...]
        if (favData) {
          setMyFavorites(favData.map(f => f.wish_id));
        }
      }
      
      setLoading(false);
    }
    fetchData();
  }, []);

  // ❤️ 處理愛心點擊 (這段邏輯跟詳細頁很像，但多了一個防止跳轉)
  const toggleFavorite = async (e: React.MouseEvent, wishId: string) => {
    e.preventDefault(); // 🛑 阻止連結跳轉 (重要！)
    e.stopPropagation(); // 🛑 阻止事件冒泡

    if (!currentUser) {
      alert('請先登入才能收藏喔！');
      return;
    }

    const isFav = myFavorites.includes(wishId);

    // 樂觀更新 (Optimistic UI)：還沒等資料庫回應，先改畫面，感覺比較快
    if (isFav) {
      setMyFavorites(prev => prev.filter(id => id !== wishId)); // 移除
      await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('wish_id', wishId);
    } else {
      setMyFavorites(prev => [...prev, wishId]); // 加入
      await supabase.from('favorites').insert([{ user_id: currentUser.id, wish_id: wishId }]);
    }
  };

  const getFlag = (code: string) => {
    const flags: Record<string, string> = { JP: '🇯🇵', KR: '🇰🇷', US: '🇺🇸', UK: '🇬🇧', TW: '🇹🇼' };
    return flags[code] || code;
  };

  const filteredWishes = wishes.filter(wish => {
    const matchesSearch = wish.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || wish.category === selectedCategory;
    const matchesCountry = selectedCountry === 'all' || wish.target_country === selectedCountry;
    return matchesSearch && matchesCategory && matchesCountry;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 搜尋與篩選區 */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 pl-12 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-lg transition-all"/>
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          </div>

          <div className="relative min-w-[160px]">
             <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full h-full p-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 appearance-none bg-white cursor-pointer">
               <option value="all">{t.allCountries}</option>
               {countriesList.map(code => (
                 // @ts-ignore
                 <option key={code} value={code}>{t.countries[code]}</option>
               ))}
             </select>
             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
          </div>
        </div>

        {/* 分類按鈕 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categoriesList.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
              {/* @ts-ignore */}
              {t.categories[cat]}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">{t.latestWishes}</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-100 h-96 animate-pulse p-4"><div className="h-48 bg-gray-200 rounded-lg mb-4"></div><div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div><div className="h-6 bg-gray-200 rounded w-2/3"></div></div>)}
          </div>
        ) : filteredWishes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow"><p className="text-gray-500 mb-4">{t.noData}</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWishes.map((wish) => {
              // 判斷這一張卡片有沒有被收藏
              const isFav = myFavorites.includes(wish.id);

              return (
                <Link key={wish.id} href={`/wish/${wish.id}`} className="block group relative">
                  <div className="bg-white rounded-xl shadow-sm group-hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col h-full cursor-pointer">
                    <div className="h-48 bg-gray-100 relative w-full overflow-hidden">
                      {wish.images && wish.images.length > 0 ? (
                        <img src={wish.images[0]} alt={wish.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🎁</div>
                      )}
                      
                      {/* 分類標籤 */}
                      <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                        {/* @ts-ignore */}
                        {t.categories[wish.category] || t.categories.other}
                      </span>

                      {/* 🔽 新增：首頁的愛心按鈕 */}
                      <button
                        onClick={(e) => toggleFavorite(e, wish.id)}
                        className={`absolute top-2 right-2 p-2 rounded-full transition shadow-sm ${
                          isFav ? 'bg-white text-red-500' : 'bg-black/30 text-white hover:bg-white hover:text-red-300'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill={isFav ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </button>

                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {/* @ts-ignore */}
                          {t.countries[wish.target_country]} {t.target}
                        </span>
                        <span className="text-lg font-bold text-gray-900">${wish.budget}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1 group-hover:text-blue-600">{wish.title}</h3>
                      <button className="w-full mt-auto py-2 border border-blue-600 text-blue-600 rounded-lg font-medium group-hover:bg-blue-600 group-hover:text-white transition">{t.helpBuy}</button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}