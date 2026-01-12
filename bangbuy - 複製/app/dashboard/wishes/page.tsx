'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/EmptyState';

export default function MyWishesPage() {
  const [myWishes, setMyWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Full page reload 導航
        window.location.assign('/login');
        return;
      }

      const { data: wishes } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .neq('status', 'completed')  // 排除已完成的需求
        .order('created_at', { ascending: false });
      
      setMyWishes(wishes || []);
      setLoading(false);
    }
    fetchWishes();
  }, []);

  const handleDeleteWish = async (id: string) => {
    if (!confirm('確定要刪除這個需求嗎？')) return;
    const { error } = await supabase.from('wish_requests').delete().eq('id', id);
    if (error) {
      alert('刪除失敗：' + error.message);
      return;
    }
    // 使用 client-side 更新，不 reload
    setMyWishes(prev => prev.filter(wish => wish.id !== id));
  };

  if (loading) {
    return (
      <DashboardLayout title="🎁 我的需求" activeTab="wishes">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (myWishes.length === 0) {
    return (
      <DashboardLayout title="🎁 我的需求" activeTab="wishes">
        <EmptyState 
          icon="🎁" 
          title="還沒有願望"
          description="你還沒有發布任何願望，開始發布你的第一個代購需求吧！"
          actionLabel="發布願望"
          actionHref="/create"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="🎁 我的需求" activeTab="wishes">
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
                <a href={`/wish/${wish.id}`} className="flex-grow font-bold text-gray-800 hover:text-blue-600">
                  {wish.title}
                </a>
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
    </DashboardLayout>
  );
}
