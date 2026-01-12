'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';

interface MyFavoritesTabProps {
  userId: string;
}

// 簡單的 cache：記住已載入的資料
const favoritesCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 秒

export default function MyFavoritesTab({ userId }: MyFavoritesTabProps) {
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 獲取收藏列表的函數（可重用）
  const fetchFavorites = useCallback(async () => {
    // 檢查 cache（但只在非強制重新載入時使用）
    const cached = favoritesCache.get(userId);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setMyFavorites(cached.data);
      setLoading(false);
      return;
    }
    
    try {
      const fetchNow = Date.now(); // 在實際 fetch 時記錄時間
      // Step 1: 最小可行查詢 - 只查 favorites 表的基本欄位
      const { data: favs, error: favError } = await supabase
        .from('favorites')
        .select('id, user_id, wish_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (favError) {
        console.error('[收藏頁] Step 1 查詢失敗:', {
          error: favError.message,
          code: favError.code,
          details: favError.details,
          hint: favError.hint,
        });
        setMyFavorites([]);
        setLoading(false);
        return;
      }

      if (!favs || favs.length === 0) {
        setMyFavorites([]);
        setLoading(false);
        return;
      }

      // Step 2: 查詢對應的 wish_requests 資料
      const wishIds = favs.map((f: any) => f.wish_id).filter(Boolean);
      
      if (wishIds.length === 0) {
        setMyFavorites([]);
        setLoading(false);
        return;
      }

      const { data: wishesData, error: wishesError } = await supabase
        .from('wish_requests')
        .select('id, title, description, budget, target_country, images, status, buyer_id, created_at')
        .in('id', wishIds);

      if (wishesError) {
        console.error('[收藏頁] Step 2 查詢失敗:', {
          error: wishesError.message,
          code: wishesError.code,
          details: wishesError.details,
          hint: wishesError.hint,
        });
        setMyFavorites(favs.map((f: any) => ({ ...f, wish_requests: null })));
        setLoading(false);
        return;
      }

      // Step 3: 合併資料
      let favorites: any[] = [];
      if (wishesData) {
        const wishMap = new Map(wishesData.map((w: any) => [w.id, w]));
        favorites = favs.map((f: any) => ({
          ...f,
          wish_requests: wishMap.get(f.wish_id) || null,
        }));
      } else {
        favorites = favs.map((f: any) => ({ ...f, wish_requests: null }));
      }
      setMyFavorites(favorites);
      favoritesCache.set(userId, { data: favorites, timestamp: fetchNow });
    } catch (err: any) {
      console.error('[收藏頁] 未預期的錯誤:', err);
      setMyFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 初始載入
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // 當頁面重新獲得焦點時重新獲取（確保收藏後能立刻看到）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 清除 cache，強制重新載入
        favoritesCache.delete(userId);
        fetchFavorites();
      }
    };

    const handleFocus = () => {
      // 清除 cache，強制重新載入
      favoritesCache.delete(userId);
      fetchFavorites();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchFavorites, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const validFavorites = myFavorites.filter((fav: any) => fav.wish_requests !== null);

  if (validFavorites.length === 0) {
    return (
      <EmptyState 
        icon="❤️" 
        title="還沒有收藏"
        description="你還沒有收藏任何需求，開始探索並收藏你感興趣的需求吧！"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {validFavorites.map((fav: any) => {
        const wish = fav.wish_requests;
        if (!wish) return null;
        
        return (
          <Link key={fav.id} href={`/wish/${wish.id}`} className="group border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden bg-white">
            <div className="h-32 bg-gray-100 relative">
              {wish.images?.[0] ? (
                <img src={wish.images[0]} className="w-full h-full object-cover" alt={wish.title} />
              ) : (
                <div className="flex items-center justify-center h-full text-2xl text-gray-400">🎁</div>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-bold text-gray-800 line-clamp-1 mb-2">{wish.title}</h4>
              <div className="flex items-center justify-between">
                <p className="text-blue-600 font-bold text-sm">${wish.budget || 'N/A'}</p>
                <span className="text-xs text-gray-500">{wish.target_country || 'N/A'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

