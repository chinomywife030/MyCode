'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';

interface MyWishesTabProps {
  userId: string;
}

// 簡單的 cache：記住已載入的資料
const wishesCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 秒

export default function MyWishesTab({ userId }: MyWishesTabProps) {
  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishes() {
      // 檢查 cache
      const cached = wishesCache.get(userId);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setMyWishes(cached.data);
        setLoading(false);
        return;
      }

      const { data: wishes } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      
      const wishesData = wishes || [];
      setMyWishes(wishesData);
      wishesCache.set(userId, { data: wishesData, timestamp: now });
      setLoading(false);
    }
    fetchWishes();
  }, [userId]);

  const handleDeleteWish = async (id: string) => {
    if (!confirm('確定要刪除這個需求嗎？')) return;
    await supabase.from('wish_requests').delete().eq('id', id);
    const updated = myWishes.filter((w) => w.id !== id);
    setMyWishes(updated);
    // 清除 cache，強制下次重新載入
    wishesCache.delete(userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (myWishes.length === 0) {
    return (
      <EmptyState 
        icon="🎁" 
        title="還沒有願望"
        description="你還沒有發布任何願望，開始發布你的第一個代購需求吧！"
        actionLabel="發布願望"
        actionHref="/create"
      />
    );
  }

  return (
    <div className="space-y-4">
      {myWishes.map((wish) => {
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
          <div key={wish.id} className="group border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition">
            <div className="flex justify-between items-start gap-3 mb-2">
              <Link href={`/wish/${wish.id}`} className="flex-grow font-bold text-gray-800 hover:text-blue-600">
                {wish.title}
              </Link>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${getStatusStyle(mockStatus)}`}>
                  {getStatusText(mockStatus)}
                </span>
                <button 
                  onClick={() => handleDeleteWish(wish.id)} 
                  className="text-gray-400 hover:text-red-500 p-2 transition" 
                  aria-label="刪除需求"
                >
                  🗑️
                </button>
              </div>
            </div>
            {wish.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{wish.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>預算: ${wish.budget || 'N/A'}</span>
              <span>目標國家: {wish.target_country || 'N/A'}</span>
              <span>建立時間: {new Date(wish.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

