'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReviewModal from '@/components/ReviewModal';
import UberStyleReviewSection from '@/components/UberStyleReviewSection';

export default function WishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [wish, setWish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 收藏與使用者狀態
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // 🎨 純 UI state：評價 Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!params.id) return;

      // 1. 抓取當前使用者
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. 抓取許願單資料
      const { data: wishData, error } = await supabase
        .from('wish_requests')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('找不到這筆資料', error);
      } else {
        setWish(wishData);
      }

      // 3. 檢查是否已收藏
      if (user && wishData) {
        const { data: favData } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('wish_id', wishData.id)
          .single();
        
        if (favData) setIsFavorited(true);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  // ❤️ 切換收藏狀態
  const toggleFavorite = async () => {
    if (!user) {
      alert('請先登入才能收藏喔！');
      return;
    }

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('wish_id', wish.id);
      setIsFavorited(false);
    } else {
      await supabase
        .from('favorites')
        .insert([{ user_id: user.id, wish_id: wish.id }]);
      setIsFavorited(true);
    }
  };

  // 🗑️ 刪除功能
  const handleDelete = async () => {
    const confirmDelete = window.confirm('確定要刪除這個許願單嗎？');
    if (!confirmDelete) return;

    setIsDeleting(true);
    const { error } = await supabase.from('wish_requests').delete().eq('id', params.id);

    if (error) {
      alert('刪除失敗：' + error.message);
      setIsDeleting(false);
    } else {
      alert('🗑️ 已刪除！');
      router.push('/');
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">載入中...</div>;
  if (!wish) return <div className="p-10 text-center text-red-500">找不到這個許願單 😭</div>;

  // 判斷是否為自己的文章
  const isOwner = user && user.id === wish.buyer_id;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden relative">
        
        {/* 圖片區 */}
        <div className="w-full h-64 sm:h-96 bg-gray-200 relative group">
          {wish.images && wish.images.length > 0 ? (
            <img 
              src={wish.images[0]} 
              alt={wish.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col">
              <span className="text-6xl mb-2">🎁</span>
              <span>無圖片</span>
            </div>
          )}
          
          <Link 
            href="/" 
            className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm transition"
          >
            ← 返回列表
          </Link>
        </div>

        {/* 內容區 */}
        <div className="p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  {wish.target_country === 'JP' ? '🇯🇵 日本' : wish.target_country}
                </span>
                {/* ✨ 狀態標籤（純 UI） */}
                {(() => {
                  const mockStatus = wish.status || 'pending';
                  const getStatusStyle = (status: string) => {
                    switch(status) {
                      case 'in_progress': return 'bg-blue-100 text-blue-700';
                      case 'done': return 'bg-orange-100 text-orange-700';
                      default: return 'bg-gray-100 text-gray-600';
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
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(mockStatus)}`}>
                      {getStatusText(mockStatus)}
                    </span>
                  );
                })()}
                <span className="text-gray-500 text-sm">📅 截止：{wish.deadline}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">{wish.title}</h1>
                
                {/* ❤️ 愛心按鈕 */}
                {!isOwner && (
                  <button 
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full transition ${isFavorited ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-300 hover:bg-gray-50'}`}
                    title={isFavorited ? '取消收藏' : '加入收藏'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-3xl font-bold text-blue-600">
                NT$ {wish.budget}
              </div>
              
              {/* 🗑️ 刪除按鈕 */}
              {isOwner && (
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-400 text-sm hover:text-red-600 underline cursor-pointer"
                >
                  {isDeleting ? '刪除中...' : '🗑️ 刪除此單'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">詳細需求描述</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
              {wish.description}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-8">
            
            {/* 接單報價區域 */}
            {!isOwner && user && (
              <div className="flex flex-col items-center gap-3">
                <button 
                  onClick={async () => {
                    const price = prompt('請輸入您想報價的金額 (包含代購費):', wish.budget);
                    if (!price) return;
                    
                    const { error } = await supabase.from('orders').insert([{
                      wish_id: wish.id,
                      buyer_id: wish.buyer_id,
                      shopper_id: user.id,
                      price: Number(price),
                      status: 'pending'
                    }]);

                    if (error) alert('接單失敗: ' + error.message);
                    else alert('🎉 報價成功！請等待買家確認。');
                  }}
                  className="bg-orange-500 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  ✋ 我要接單報價
                </button>
                {/* ✨ 「私訊接單」次要按鈕 */}
                <Link
                  href={`/chat?target=${wish.buyer_id}`}
                  onClick={() => {
                    console.log('私訊接單 clicked for wish:', wish.id, 'target:', wish.buyer_id);
                  }}
                  className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-orange-600 px-8 py-3 rounded-full text-base font-semibold transition border-2 border-orange-500 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>私訊接單</span>
                </Link>
              </div>
            )}
            
            {!isOwner && !user && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-400 mb-2">請先登入以進行接單或私訊。</p>
                <Link
                  href="/login"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-bold transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  登入以私訊接單
                </Link>
              </div>
            )}

            {isOwner && (
              <p className="text-gray-400">這是您自己的許願單，請去「會員中心 &gt; 我的訂單」查看有沒有人接單喔！</p>
            )}

          </div>
          
          {/* 🎨 Uber 式評價區域（純 UI，假資料示範） */}
          {!isOwner && user && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <UberStyleReviewSection
                orderStatus={{
                  orderId: wish.id,
                  canCurrentUserReview: true,
                  hasCurrentUserReviewed: false, // 🎨 假資料：改成 true 看看已評價狀態
                  hasOtherSideReviewed: true, // 🎨 假資料：對方是否已評價
                  otherSideName: wish.buyer?.name || '買家',
                  otherSideType: 'buyer'
                }}
              />
              <p className="text-xs text-gray-400 text-center mt-4">
                💡 這是 Uber 式雙向評價 UI prototype（純前端假資料）
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}