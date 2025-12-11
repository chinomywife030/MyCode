'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';

export default function Home() {
  const { mode } = useUserMode();
  const router = useRouter();
  
  // ========== State 管理（完全不變）==========
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========== 載入資料的主要邏輯（完全不變）==========
  useEffect(() => {
    let isMounted = true;

    async function loadAllData() {
      try {
        setLoading(true);
        setError(null);

        let userData = null;
        try {
          const { data: userResponse, error: userError } = await supabase.auth.getUser();
          
          if (!isMounted) return;
          
          if (!userError && userResponse?.user) {
            userData = userResponse.user;
            setCurrentUser(userData);
          }
        } catch (err) {
          if (!isMounted) return;
        }

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
  }, []);

  // ========== 收藏功能（完全不變）==========
  const toggleFavorite = useCallback(async (e: React.MouseEvent, wishId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert('請先登入才能收藏');
      return;
    }

    const isFav = myFavorites.includes(wishId);

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
          setMyFavorites(prev => [...prev, wishId]);
          alert('移除收藏失敗，請稍後再試');
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{ user_id: currentUser.id, wish_id: wishId }]);

        if (error) {
          setMyFavorites(prev => prev.filter(id => id !== wishId));
          alert('新增收藏失敗，請稍後再試');
        }
      }
    } catch (err) {
      if (isFav) {
        setMyFavorites(prev => [...prev, wishId]);
      } else {
        setMyFavorites(prev => prev.filter(id => id !== wishId));
      }
      alert('操作失敗，請稍後再試');
    }
  }, [currentUser, myFavorites]);

  // ========== 工具函數（完全不變）==========
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

  // ========== UI 渲染（統一風格，橘藍配色）==========
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <RoleSelectorModal />
      <Navbar />

      {/* Hero Banner - 橘藍配色 */}
      <div className={`${
        mode === 'requester' 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
          : 'bg-gradient-to-r from-orange-500 to-orange-600'
      } shadow-sm`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="text-white">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
              {mode === 'requester' ? '找到完美代購' : '開始接單賺錢'}
            </h1>
            <p className="text-white/90 text-sm sm:text-base mb-6 font-light max-w-xl">
              {mode === 'requester' 
                ? '連結可信賴的代購者，輕鬆購買全球商品' 
                : '利用您的旅行計畫，幫助他人並賺取收入'}
            </p>
            <Link 
              href={mode === 'requester' ? '/create' : '/trips/create'} 
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg bg-white text-blue-600 hover:bg-blue-50"
            >
              <span>{mode === 'requester' ? '發布需求' : '發布行程'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Feed Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Error Message - 統一風格 */}
        {error && (
          <div className="bg-white rounded-xl p-5 mb-6 border border-red-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">載入失敗</h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-sm bg-orange-500 text-white px-5 py-2 rounded-full font-semibold hover:bg-orange-600 transition"
                >
                  重新載入
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Header - 統一風格 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {mode === 'requester' ? '最新行程' : '熱門需求'}
          </h2>
          <p className="text-sm text-gray-500">
            {mode === 'requester' ? '即將出發的代購行程' : '可接單的代購需求'}
          </p>
        </div>

        {/* Loading State - 統一風格 */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Requester Mode - Trips Feed */}
            {mode === 'requester' ? (
              trips.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✈️</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">目前沒有行程</h3>
                  <p className="text-sm text-gray-500 mb-4">等待代購者發布行程資訊</p>
                  <Link 
                    href="/trips"
                    className="inline-block text-sm text-blue-600 font-semibold hover:text-blue-700"
                  >
                    了解更多 →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div 
                      key={trip.id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-5">
                        {/* Card Header - 統一風格 */}
                        <div className="flex items-start justify-between mb-4">
                          <Link 
                            href={`/profile/${trip.shopper_id}`}
                            className="flex items-center gap-3 hover:opacity-75 transition group"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                              {trip.shopper?.avatar_url ? (
                                <img src={trip.shopper.avatar_url} className="w-full h-full rounded-full object-cover" alt=""/>
                              ) : (
                                <span className="text-base">{trip.shopper_name?.[0] || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition">
                                {trip.shopper_name || trip.shopper?.name || '匿名'}
                              </p>
                              <p className="text-xs text-gray-500">代購夥伴</p>
                            </div>
                          </Link>
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                            {trip.date}
                          </span>
                        </div>

                        {/* Card Content - 統一風格 */}
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            前往 {trip.destination}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {trip.description}
                          </p>
                        </div>

                        {/* Card Actions - 統一風格 */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="text-sm text-gray-500">
                            <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            聯繫
                          </div>
                          <Link 
                            href={`/chat?target=${trip.shopper_id}`}
                            className="px-5 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition text-sm shadow-sm"
                          >
                            私訊
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Shopper Mode - Wishes Feed */
              wishes.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎁</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">目前沒有需求</h3>
                  <p className="text-sm text-gray-500 mb-4">等待買家發布代購需求</p>
                  <Link 
                    href="/create"
                    className="inline-block text-sm text-orange-600 font-semibold hover:text-orange-700"
                  >
                    發布第一個需求 →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {wishes.map((wish) => {
                    // 🎨 純 UI：模擬狀態（之後可從真實資料讀取）
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
                    <Link 
                      key={wish.id} 
                      href={`/wish/${wish.id}`}
                      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-5">
                        {/* Card Header - 統一風格 */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-sm">
                              {wish.buyer?.avatar_url ? (
                                <img src={wish.buyer.avatar_url} className="w-full h-full rounded-full object-cover" alt=""/>
                              ) : (
                                <span className="text-base">{wish.buyer?.name?.[0]}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-gray-900">{wish.buyer?.name || '匿名'}</p>
                              <p className="text-xs text-gray-500">需要幫助</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100 flex items-center gap-1">
                              <span>{getFlag(wish.target_country)}</span>
                              <span>{wish.target_country}</span>
                            </span>
                            {/* ✨ 狀態標籤（純 UI） */}
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyle(mockStatus)}`}>
                              {getStatusText(mockStatus)}
                            </span>
                          </div>
                        </div>

                        {/* Card Image */}
                        {wish.images?.[0] && (
                          <div className="relative w-full h-56 rounded-xl overflow-hidden mb-4 bg-gray-100">
                            <img 
                              src={wish.images[0]} 
                              className="w-full h-full object-cover"
                              alt={wish.title}
                            />
                          </div>
                        )}

                        {/* Card Content - 統一風格 */}
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                            {wish.title}
                          </h3>
                          <div className="inline-flex items-baseline gap-1.5 px-4 py-2 bg-orange-50 rounded-full border border-orange-100">
                            <span className="text-xs font-semibold text-orange-700">NT$</span>
                            <span className="text-xl font-bold text-orange-600">
                              {Number(wish.budget).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions - 統一風格 */}
                        <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <button 
                              onClick={(e) => toggleFavorite(e, wish.id)}
                              className={`flex items-center gap-2 text-sm font-semibold transition ${
                                myFavorites.includes(wish.id)
                                  ? 'text-red-500'
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <svg className="w-5 h-5" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span>{myFavorites.includes(wish.id) ? '已收藏' : '收藏'}</span>
                            </button>
                            <div className="text-sm text-gray-500 font-medium flex items-center gap-1">
                              <span>查看詳情</span>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                          {/* ✨ 「私訊接單」主按鈕（橘色，純 UI） */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('私訊接單 clicked for wish:', wish.id, 'target:', wish.buyer_id);
                              router.push(`/chat?target=${wish.buyer_id}`);
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition shadow-sm hover:shadow-md text-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>私訊接單</span>
                          </button>
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
