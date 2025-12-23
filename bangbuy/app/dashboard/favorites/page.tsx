'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/EmptyState';

export default function MyFavoritesPage() {
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 獲取收藏列表的函數（可重用）
  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Full page reload 導航
      window.location.assign('/login');
      return;
    }

    try {
      // 🔥 一次查詢：JOIN wish_requests 和 buyer profiles
      const { data: favs, error: favError } = await supabase
        .from('favorites')
        .select(`
          id,
          user_id,
          wish_id,
          created_at,
          wish_requests:wish_requests!favorites_wish_id_fkey(
            id,
            title,
            description,
            budget,
            target_country,
            images,
            status,
            buyer_id,
            created_at,
            profiles!wish_requests_buyer_id_fkey(id, name, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favError) {
        console.error('[收藏頁] 查詢失敗:', {
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

      // 資料已經 JOIN 完成，直接使用
      setMyFavorites(favs);
    } catch (err: any) {
      console.error('[收藏頁] 未預期的錯誤:', err);
      setMyFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    fetchFavorites();
    
    // 🔥 監聽收藏更新事件（首頁點愛心後觸發）
    const handleFavoritesUpdate = () => {
      fetchFavorites();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [fetchFavorites]);

  if (loading) {
    return (
      <DashboardLayout title="❤️ 我的收藏" activeTab="favorites">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const validFavorites = myFavorites.filter((fav: any) => fav.wish_requests !== null);

  if (validFavorites.length === 0) {
    return (
      <DashboardLayout title="❤️ 我的收藏" activeTab="favorites">
        <EmptyState 
          icon="❤️" 
          title="還沒有收藏"
          description="你還沒有收藏任何需求，開始探索並收藏你感興趣的需求吧！"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="❤️ 我的收藏" activeTab="favorites">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {validFavorites.map((fav: any) => {
          const wish = fav.wish_requests;
          if (!wish) return null;
          
          return (
            <a key={fav.id} href={`/wish/${wish.id}`} className="group border border-gray-100 rounded-xl hover:shadow-md transition overflow-hidden bg-white">
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
            </a>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
