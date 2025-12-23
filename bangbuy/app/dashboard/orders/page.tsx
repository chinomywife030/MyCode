'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/EmptyState';
import ReviewModal from '@/components/ReviewModal';
import { isFeatureEnabled } from '@/lib/featureFlags';

export default function MyOrdersPage() {
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; orderId: string; targetId: string; targetName: string } | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Full page reload 導航
        window.location.assign('/login');
        return;
      }
      setUser(user);

      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          wish_requests (title, images),
          profiles!orders_shopper_id_fkey (name), 
          buyer_profile:profiles!orders_buyer_id_fkey (name)
        `)
        .or(`buyer_id.eq.${user.id},shopper_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (orders) {
        const visibleOrders = orders.filter((o) => {
          if (o.buyer_id === user.id) return !o.archived_by_buyer;
          if (o.shopper_id === user.id) return !o.archived_by_shopper;
          return true;
        });
        setMyOrders(visibleOrders);
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string, wishId?: string) => {
    try {
      const { error: orderError } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (orderError) throw orderError;
      
      if (status === 'completed' && wishId) {
        const { error: wishError } = await supabase.from('wish_requests').update({ status: 'closed' }).eq('id', wishId);
        if (wishError) throw wishError;
      }
      
      // 使用 client-side 更新，不 reload
      setMyOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));
    } catch (error: any) {
      console.error('更新訂單狀態失敗', error);
      alert('更新失敗：' + (error.message || '未知錯誤'));
    }
  };

  const handleArchiveOrder = async (order: any) => {
    if (!user) return;
    const isBuyer = order.buyer_id === user.id;
    const fieldToUpdate = isBuyer ? 'archived_by_buyer' : 'archived_by_shopper';

    if (!confirm('確定要隱藏這筆訂單嗎？\n(隱藏後仍保留於資料庫，可向客服協助恢復)')) return;

    const { error } = await supabase.from('orders').update({ [fieldToUpdate]: true }).eq('id', order.id);

    if (error) {
      alert('操作失敗: ' + error.message);
    } else {
      // 使用 client-side 更新，不 reload
      setMyOrders(prev => prev.filter(o => o.id !== order.id));
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="📦 我的訂單" activeTab="orders">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (myOrders.length === 0) {
    return (
      <DashboardLayout title="📦 我的訂單" activeTab="orders">
        <EmptyState 
          icon="📦" 
          title="沒有訂單記錄"
          description="你目前沒有任何代購訂單，發布需求或建立第一筆訂單吧！"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="📦 我的訂單" activeTab="orders">
      <div className="space-y-4">
        {myOrders.map((order) => {
          const isBuyer = user?.id === order.buyer_id;
          return (
            <div
              key={order.id}
              className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 hover:shadow-md transition bg-white"
            >
              <div className="flex gap-4 flex-grow">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {order.wish_requests?.images?.[0] ? (
                    <img src={order.wish_requests.images[0]} className="w-full h-full object-cover" alt={order.wish_requests.title} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">📦</div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{order.wish_requests?.title || '已刪除的需求'}</h4>
                  <p className="text-sm text-gray-500">
                    {isBuyer ? `代購者: ${order.profiles?.name || '未知'}` : `買家: ${order.buyer_profile?.name || '未知'}`}
                  </p>
                  <p className="text-sm font-bold text-blue-600 mt-1">${order.price || 0}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 min-w-[120px]">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold 
                  ${
                    order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : order.status === 'accepted'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {order.status === 'pending'
                    ? '待確認'
                    : order.status === 'accepted'
                      ? '進行中'
                      : order.status === 'completed'
                        ? '已完成'
                        : order.status}
                </span>

                {isBuyer && order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'accepted', order.wish_id)}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                  >
                    確認委託
                  </button>
                )}

                {order.status === 'accepted' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed', order.wish_id)}
                    className="border border-green-600 text-green-600 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-green-50 transition"
                  >
                    完成訂單
                  </button>
                )}

                {order.status === 'completed' && isFeatureEnabled('ratings') && (() => {
                  const targetId = isBuyer ? order.shopper_id : order.buyer_id;
                  const targetName = isBuyer ? (order.profiles?.name || '代購') : (order.buyer_profile?.name || '買家');
                  const hasReviewed = order.id?.endsWith('1') || false;
                  
                  return hasReviewed ? (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      已評價
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setReviewModal({
                          open: true,
                          orderId: order.id,
                          targetId,
                          targetName: targetName || '對方',
                        });
                      }}
                      className="text-sm bg-orange-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-orange-600 transition"
                    >
                      評價
                    </button>
                  );
                })()}

                {(order.status === 'completed' || order.status === 'cancelled') && (
                  <button
                    onClick={() => handleArchiveOrder(order)}
                    className="text-gray-400 hover:text-gray-600 p-1 mt-1 transition text-xs flex items-center gap-1"
                    title="從列表隱藏"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                    隱藏訂單
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isFeatureEnabled('ratings') && reviewModal?.open && (
        <ReviewModal
          orderId={reviewModal.orderId}
          targetId={reviewModal.targetId}
          targetName={reviewModal.targetName}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {}}
        />
      )}
    </DashboardLayout>
  );
}
