'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [wish, setWish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 🔽 新增：收藏狀態
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<any>(null);

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

      // 3. 檢查是否已收藏 (如果有登入的話)
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
      // 取消收藏 (刪除資料)
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('wish_id', wish.id);
      setIsFavorited(false);
    } else {
      // 加入收藏 (新增資料)
      await supabase
        .from('favorites')
        .insert([{ user_id: user.id, wish_id: wish.id }]);
      setIsFavorited(true);
    }
  };

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

  // 判斷是否為自己的文章 (如果是自己，顯示刪除按鈕；不是自己，顯示收藏按鈕)
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
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  {wish.target_country === 'JP' ? '🇯🇵 日本' : wish.target_country}
                </span>
                <span className="text-gray-500 text-sm">📅 截止：{wish.deadline}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">{wish.title}</h1>
                
                {/* ❤️ 愛心按鈕 (只有不是自己的文章才顯示) */}
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
              
              {/* 🗑️ 刪除按鈕 (只有作者本人看得到) */}
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

          <div className="border-t border-gray-100 pt-8 text-center">
            {/* 只有非作者本人，才顯示接單按鈕 */}
            {!isOwner ? (
              !showContact ? (
                <button 
                  onClick={() => setShowContact(true)}
                  className="bg-blue-600 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  ✋ 我可以幫忙代購
                </button>
              ) : (
                <div className="animate-fade-in bg-blue-50 p-6 rounded-xl inline-block w-full max-w-lg">
                  <p className="text-sm text-gray-500 mb-2">已取得買家聯絡方式：</p>
                  <div className="text-4xl font-bold text-gray-800 mb-2 select-all">
                    {wish.buyer_contact_value}
                  </div>
                  <p className="text-blue-600 font-medium">(請使用 LINE 搜尋 ID)</p>
                </div>
              )
            ) : (
              <p className="text-gray-400">這您自己的許願單，等待有緣人來接單吧！</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}