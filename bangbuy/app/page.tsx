'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';

export default function Home() {
  const { mode } = useUserMode();
  
  // ========== State 管理 ==========
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========== 載入資料的主要邏輯 ==========
  useEffect(() => {
    let isMounted = true;

    async function loadAllData() {
      try {
        setLoading(true);
        setError(null);

        // 步驟 1: 載入使用者資訊
        let userData = null;
        try {
          const { data: userResponse, error: userError } = await supabase.auth.getUser();
          
          if (!isMounted) return;
          
          if (!userError && userResponse?.user) {
            userData = userResponse.user;
            setCurrentUser(userData);
          }
        } catch (err) {
          // 使用者載入失敗不影響其他功能，繼續執行
          if (!isMounted) return;
        }

        // 步驟 2: 載入許願單
        try {
          const { data: wishData, error: wishError } = await supabase
            .from('wish_requests')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(50);

          if (!isMounted) return;

          if (wishError) {
            setWishes([]);
          } else {
            const processedWishes = (wishData || []).map((wish: any) => ({
              ...wish,
              buyer: { name: '匿名', avatar_url: '' }
            }));
            setWishes(processedWishes);
          }
        } catch (err) {
          if (!isMounted) return;
          setWishes([]);
        }

        // 步驟 3: 載入行程
        try {
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

          if (!isMounted) return;

          if (tripError) {
            setTrips([]);
          } else {
            const processedTrips = (tripData || []).map((trip: any) => ({
              ...trip,
              shopper: {
                name: trip.shopper_name || '匿名',
                avatar_url: ''
              }
            }));
            setTrips(processedTrips);
          }
        } catch (err) {
          if (!isMounted) return;
          setTrips([]);
        }

        // 步驟 4: 如果有登入，載入收藏
        if (userData && isMounted) {
          try {
            const { data: favData, error: favError } = await supabase
              .from('favorites')
              .select('wish_id')
              .eq('user_id', userData.id);

            if (!isMounted) return;

            if (!favError && favData) {
              setMyFavorites(favData.map((f: any) => f.wish_id));
            }
          } catch (err) {
            if (!isMounted) return;
            // 收藏載入失敗不影響主要功能
          }
        }

        if (isMounted) {
          setError(null);
        }

      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || '資料載入時發生錯誤，請重新整理頁面');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, []); // 空依賴陣列，只在 mount 時執行一次

  // ========== 收藏功能 ==========
  const toggleFavorite = useCallback(async (e: React.MouseEvent, wishId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert('請先登入才能收藏');
      return;
    }

    const isFav = myFavorites.includes(wishId);

    // 樂觀更新 UI
    if (isFav) {
      setMyFavorites(prev => prev.filter(id => id !== wishId));
    } else {
      setMyFavorites(prev => [...prev, wishId]);
    }

    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('wish_id', wishId);

        if (error) {
          // 失敗時恢復 UI
          setMyFavorites(prev => [...prev, wishId]);
          alert('移除收藏失敗，請稍後再試');
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: currentUser.id, wish_id: wishId }]);

        if (error) {
          // 失敗時恢復 UI
          setMyFavorites(prev => prev.filter(id => id !== wishId));
          alert('新增收藏失敗，請稍後再試');
        }
      }
    } catch (err) {
      // 失敗時恢復 UI
      if (isFav) {
        setMyFavorites(prev => [...prev, wishId]);
      } else {
        setMyFavorites(prev => prev.filter(id => id !== wishId));
      }
      alert('操作失敗，請稍後再試');
    }
  }, [currentUser, myFavorites]);

  // ========== 國旗顯示 ==========
  const getFlag = useCallback((code: string) => {
    const flags: Record<string, string> = {
      JP: '🇯🇵',
      KR: '🇰🇷',
      US: '🇺🇸',
      UK: '🇬🇧',
      TW: '🇹🇼'
    };
    return flags[code] || code;
  }, []);

  // ========== 渲染 ==========
  return (
    <div className="min-h-screen bg-white pb-20">
      <RoleSelectorModal />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        
        {/* Hero Section */}
        <div className={`rounded-2xl p-10 lg:p-12 mb-12 text-white transition-all duration-300 ${
          mode === 'requester' 
            ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
            : 'bg-gradient-to-r from-orange-500 to-orange-400'
        }`}>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 max-w-3xl leading-tight">
            {mode === 'requester' ? '找人幫你買？' : '想接單賺旅費？'}
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl leading-relaxed mb-8 opacity-95">
            {mode === 'requester' 
              ? '瀏覽即將出發的留學生行程，直接委託他們幫你代購。' 
              : '瀏覽許願清單，看看大家想要什麼，順路幫帶賺額外收入。'}
          </p>
          <Link 
            href={mode === 'requester' ? '/create' : '/trips/create'} 
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 shadow-sm"
          >
            <span>{mode === 'requester' ? '發布需求' : '發布行程'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8 shadow-sm">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600 shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div className="flex-grow">
                <p className="font-bold text-red-800 mb-1">載入失敗</p>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  重新整理頁面
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 內容區域 - 需求者模式 */}
        {mode === 'requester' ? (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                即將出發的行程
              </h2>
              <p className="text-gray-600">
                把握機會，直接委託留學生幫你代購
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="h-10 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-5xl block mb-4 opacity-40">✈️</span>
                <p className="text-gray-600 mb-2">目前沒有即將出發的行程</p>
                <p className="text-sm text-gray-500">等待留學生發布行程資訊</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trips.map((trip) => (
                  <div 
                    key={trip.id} 
                    className="group bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                            {trip.date}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {trip.destination}
                        </h3>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <Link 
                        href={`/profile/${trip.shopper_id}`} 
                        className="flex items-center gap-3 hover:opacity-75 transition-opacity duration-200"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center border border-gray-200">
                          {trip.shopper?.avatar_url ? (
                            <img src={trip.shopper.avatar_url} className="w-full h-full object-cover" alt=""/>
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {trip.shopper_name?.[0] || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">代購夥伴</p>
                          <p className="text-sm font-medium text-gray-900">
                            {trip.shopper_name || trip.shopper?.name || '匿名'}
                          </p>
                        </div>
                      </Link>

                      <Link 
                        href={`/chat?target=${trip.shopper_id}`} 
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
                      >
                        私訊
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (
          // 內容區域 - 代購者模式
          <div>
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                可接單的需求
              </h2>
              <p className="text-gray-600">
                看看大家想要什麼，順路幫帶賺額外收入
              </p>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wishes.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-5xl block mb-4 opacity-40">🎁</span>
                <p className="text-gray-600">目前沒有進行中的許願單</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishes.map((wish) => (
                  <Link key={wish.id} href={`/wish/${wish.id}`} className="block group">
                    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
                      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                        {wish.images?.[0] ? (
                          <img 
                            src={wish.images[0]} 
                            className="w-full h-full object-cover" 
                            alt={wish.title}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">
                            🎁
                          </div>
                        )}
                        
                        <button 
                          onClick={(e) => toggleFavorite(e, wish.id)} 
                          className={`absolute top-3 right-3 p-2 rounded-lg transition-colors duration-200 ${
                            myFavorites.includes(wish.id) 
                              ? 'bg-white text-red-500' 
                              : 'bg-white/90 text-gray-700 hover:text-red-500'
                          }`}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} 
                            viewBox="0 0 24 24" 
                            strokeWidth={1.5} 
                            stroke="currentColor" 
                            className="w-5 h-5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                        </button>

                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white/95 text-gray-900 shadow-sm">
                            {getFlag(wish.target_country)} {wish.target_country}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-grow">
                        <div className="mb-3">
                          <h3 className="font-semibold text-base text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors duration-200">
                            {wish.title}
                          </h3>
                          <p className="text-xl font-semibold text-gray-900">
                            NT$ {Number(wish.budget).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                          <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                            {wish.buyer?.avatar_url ? (
                              <img src={wish.buyer.avatar_url} className="w-full h-full object-cover" alt=""/>
                            ) : (
                              <span className="text-xs font-medium text-gray-600">
                                {wish.buyer?.name?.[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 truncate">
                            {wish.buyer?.name || '匿名'}
                          </span>
                        </div>
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
