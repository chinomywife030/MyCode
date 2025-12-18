'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ExternalLink, { ExternalLinkWarning } from '@/components/ExternalLink';
import ImageCarousel from '@/components/ImageCarousel';
import { startChat } from '@/lib/chatNavigation';
import OfferModal from '@/components/OfferModal';
import OffersList from '@/components/OffersList';
import { getOffersForWish, Offer, getOfferStatusDisplay, formatAmount } from '@/lib/offers';

export default function WishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [wish, setWish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 收藏與使用者狀態
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // 發布者信任資訊
  const [buyerProfile, setBuyerProfile] = useState<{
    name: string | null;
    avatar_url: string | null;
    email_verified: boolean;
    created_at: string | null;
  } | null>(null);

  // 私訊按鈕 loading 狀態
  const [isChatLoading, setIsChatLoading] = useState(false);

  // 🏷️ Offer 系統狀態
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isBuyer, setIsBuyer] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [myOffer, setMyOffer] = useState<Offer | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  // 獲取報價列表
  const fetchOffers = useCallback(async () => {
    if (!params.id) return;
    
    setOffersLoading(true);
    const result = await getOffersForWish(params.id as string);
    
    if (result.success) {
      setOffers(result.offers);
      setIsBuyer(result.isBuyer || false);
      
      // 找出當前用戶的報價（如果是代購者）
      if (!result.isBuyer && user) {
        const myOff = result.offers.find(o => o.shopper_id === user.id);
        setMyOffer(myOff || null);
      }
    }
    
    setOffersLoading(false);
  }, [params.id, user]);

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
        
        // 3. 抓取發布者資料（信任提示用）
        if (wishData?.buyer_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, avatar_url, email_verified, created_at')
            .eq('id', wishData.buyer_id)
            .single();
          
          if (profileData) {
            setBuyerProfile({
              ...profileData,
              email_verified: profileData.email_verified || false,
            });
          }
        }
      }

      // 4. 檢查是否已收藏
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

  // 當用戶或 wish 載入後，獲取報價
  useEffect(() => {
    if (wish && user) {
      fetchOffers();
    }
  }, [wish, user, fetchOffers]);

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

  // 💬 私訊接單
  const handleStartChat = async () => {
    const targetUserId = wish.buyer_id;
    const isValidUUID = targetUserId && 
                     targetUserId !== '00000000-0000-0000-0000-000000000000' &&
                     targetUserId.length > 10;
    
    if (!isValidUUID) {
      alert('無法開啟聊天：發布者 ID 無效');
      return;
    }

    if (isChatLoading) return;
    setIsChatLoading(true);

    try {
      const result = await startChat({
        targetUserId,
        sourceType: 'wish_request',
        sourceId: wish.id,
        sourceTitle: wish.title || '',
      });

      if (!result.success || !result.url) {
        alert(result.error || '無法建立對話，請稍後再試');
        setIsChatLoading(false);
        return;
      }

      router.push(result.url);
    } catch (err: any) {
      console.error('[私訊接單] Error:', err);
      alert('發生錯誤，請稍後再試');
      setIsChatLoading(false);
    }
  };

  // 🏷️ 報價成功回調
  const handleOfferSuccess = (offerId: string, emailSent?: boolean) => {
    setIsOfferModalOpen(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    
    // 若 Email 發送失敗，顯示提示
    if (emailSent === false) {
      setEmailWarning('通知 Email 寄送失敗（不影響報價），買家可透過站內通知查看您的報價。');
      setTimeout(() => setEmailWarning(null), 6000);
    }
    
    fetchOffers(); // 刷新報價列表
  };

  // 計算用戶加入天數
  const getDaysSinceJoined = (createdAt: string | null) => {
    if (!createdAt) return null;
    const joined = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) return <div className="p-10 text-center text-gray-500">載入中...</div>;
  if (!wish) return <div className="p-10 text-center text-red-500">找不到這個許願單 😭</div>;

  // 判斷是否為自己的文章
  const isOwner = user && user.id === wish.buyer_id;
  const daysSinceJoined = buyerProfile ? getDaysSinceJoined(buyerProfile.created_at) : null;
  const isNewUser = daysSinceJoined !== null && daysSinceJoined < 30;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {/* 成功 Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">報價已送出！等待買家回覆</span>
          </div>
        </div>
      )}

      {/* Email 發送失敗提示 */}
      {emailWarning && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-md mx-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-3 rounded-xl shadow-lg flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium">{emailWarning}</p>
            </div>
            <button 
              onClick={() => setEmailWarning(null)} 
              className="text-amber-400 hover:text-amber-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSuccess={handleOfferSuccess}
        wishId={wish.id}
        wishTitle={wish.title}
        wishBudget={Number(wish.budget) || 0}
      />

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden relative">
        
        {/* 圖片區 - 使用 ImageCarousel */}
        <div className="w-full relative">
          <ImageCarousel 
            images={wish.images || []} 
            alt={wish.title}
            aspectRatio="16/9"
            showCounter={true}
            className="h-64 sm:h-96"
          />
          
          <Link 
            href="/" 
            className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm transition"
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
                {/* ✨ 狀態標籤 */}
                {(() => {
                  const status = wish.status || 'open';
                  const getStatusStyle = (s: string) => {
                    switch(s) {
                      case 'in_progress': return 'bg-blue-100 text-blue-700';
                      case 'completed': return 'bg-green-100 text-green-700';
                      case 'cancelled': return 'bg-red-100 text-red-700';
                      default: return 'bg-gray-100 text-gray-600';
                    }
                  };
                  const getStatusText = (s: string) => {
                    switch(s) {
                      case 'in_progress': return '進行中';
                      case 'completed': return '已完成';
                      case 'cancelled': return '已取消';
                      default: return '徵求中';
                    }
                  };
                  return (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(status)}`}>
                      {getStatusText(status)}
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

          {/* 🔗 商品參考連結（如有） */}
          {wish.product_url && (
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl mb-8">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                商品參考連結
              </h3>
              <ExternalLink 
                href={wish.product_url}
                className="text-blue-600 hover:text-blue-700 font-medium break-all"
                showWarning={true}
              >
                {wish.product_url}
              </ExternalLink>
              <ExternalLinkWarning />
            </div>
          )}

          {/* 🛡️ 發布者信任提示（代購者看） */}
          {!isOwner && buyerProfile && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-8">
              <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                發布者資訊
              </h3>
              <div className="flex items-center gap-4">
                {/* 頭像 */}
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {buyerProfile.avatar_url ? (
                    <img src={buyerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 text-lg font-bold">
                      {buyerProfile.name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                
                {/* 信任指標 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">
                      {buyerProfile.name || '匿名用戶'}
                    </span>
                    {isNewUser && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                        新手
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {/* Email 驗證狀態 */}
                    <span className="flex items-center gap-1">
                      {buyerProfile.email_verified ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-600">Email 已驗證</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Email 未驗證</span>
                        </>
                      )}
                    </span>
                    
                    {/* 加入時間 */}
                    {daysSinceJoined !== null && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        加入 {daysSinceJoined} 天
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== 🏷️ 報價區域 ========== */}
          
          {/* 買家視角：收到的報價列表 */}
          {isOwner && (
            <div className="border-t border-gray-100 pt-8 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                收到的報價
                {offers.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                    {offers.length}
                  </span>
                )}
              </h3>
              
              {offersLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <OffersList
                  offers={offers}
                  isBuyer={true}
                  onOfferUpdated={fetchOffers}
                />
              )}
            </div>
          )}

          {/* 代購者視角：我的報價狀態 + 報價按鈕 */}
          {!isOwner && user && (
            <div className="border-t border-gray-100 pt-8">
              
              {/* 如果已有報價，顯示報價狀態卡 */}
              {myOffer && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-600 mb-3">你的報價</h3>
                  <div className={`
                    border rounded-xl p-4
                    ${myOffer.status === 'pending' ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}
                  `}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-orange-600">
                        {formatAmount(myOffer.amount, myOffer.currency)}
                      </span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${getOfferStatusDisplay(myOffer.status).className}`}>
                        {getOfferStatusDisplay(myOffer.status).text}
                      </span>
                    </div>
                    {myOffer.message && (
                      <p className="text-sm text-gray-600 mb-3">{myOffer.message}</p>
                    )}
                    {myOffer.status === 'pending' && (
                      <OffersList
                        offers={[myOffer]}
                        isBuyer={false}
                        onOfferUpdated={fetchOffers}
                      />
                    )}
                    {myOffer.status === 'accepted' && (
                      <button
                        onClick={handleStartChat}
                        disabled={isChatLoading}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        開始對話
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* 報價按鈕區域 */}
              {wish.status === 'open' && !myOffer && (
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={() => setIsOfferModalOpen(true)}
                    className="bg-orange-500 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    ✋ 我要接單報價
                  </button>
                  {/* 私訊接單按鈕 */}
                  <button
                    disabled={isChatLoading}
                    onClick={handleStartChat}
                    className={`
                      flex items-center justify-center gap-2 px-8 py-3 rounded-full text-base font-semibold transition border-2 shadow-sm
                      ${isChatLoading 
                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-orange-600 border-orange-500'
                      }
                    `}
                  >
                    {isChatLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>處理中...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>先私訊詢問</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 如果已有報價但不是 pending，顯示重新報價按鈕 */}
              {wish.status === 'open' && myOffer && myOffer.status !== 'pending' && myOffer.status !== 'accepted' && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <button 
                    onClick={() => setIsOfferModalOpen(true)}
                    className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-600 transition shadow-md"
                  >
                    重新報價
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* 未登入提示 */}
          {!isOwner && !user && (
            <div className="border-t border-gray-100 pt-8">
              <div className="flex flex-col items-center gap-3">
                <p className="text-gray-400 mb-2">請先登入以進行接單或私訊。</p>
                <Link
                  href="/login"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-bold transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  登入以接單報價
                </Link>
              </div>
            </div>
          )}

          {/* 自己的需求提示 */}
          {isOwner && offers.length === 0 && (
            <p className="text-gray-400 text-center mt-4">
              等待代購者報價中... 你可以先去「會員中心」查看其他訂單狀態。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
