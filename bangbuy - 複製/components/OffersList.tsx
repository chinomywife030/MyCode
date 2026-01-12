'use client';

/**
 * 🏷️ OffersList - 報價列表組件
 * 顯示某需求收到的所有報價（買家視角）
 * 或顯示自己的報價狀態（代購者視角）
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Offer, respondToOffer, withdrawOffer, getOfferStatusDisplay, formatAmount } from '@/lib/offers';

interface OffersListProps {
  offers: Offer[];
  isBuyer: boolean;
  onOfferUpdated: () => void;
}

export default function OffersList({ offers, isBuyer, onOfferUpdated }: OffersListProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  // 處理接受/拒絕
  const handleRespond = async (offerId: string, action: 'accept' | 'reject') => {
    if (processingId) return;
    
    const confirmMessage = action === 'accept' 
      ? '確定要接受這個報價嗎？接受後將與代購者開始對話。'
      : '確定要拒絕這個報價嗎？';
    
    if (!window.confirm(confirmMessage)) return;

    setProcessingId(offerId);
    setError(null);
    setEmailWarning(null);

    try {
      const result = await respondToOffer(offerId, action);

      if (!result.success) {
        setError(result.error || '操作失敗');
        setProcessingId(null);
        return;
      }

      // 檢查 Email 發送狀態，若失敗顯示提示
      if (result.success && result.emailSent === false) {
        setEmailWarning('通知 Email 寄送失敗（不影響報價），對方可透過站內通知查看。');
        // 5秒後自動清除警告
        setTimeout(() => setEmailWarning(null), 5000);
      }

      // 如果接受，導向聊天室
      if (action === 'accept' && result.conversationId) {
        router.push(`/chat?conversation=${result.conversationId}`);
        return;
      }

      // 拒絕後刷新列表
      onOfferUpdated();
      setProcessingId(null);
    } catch (err: any) {
      console.error('[OffersList] Error:', err);
      setError('發生錯誤，請稍後再試');
      setProcessingId(null);
    }
  };

  // 處理撤回
  const handleWithdraw = async (offerId: string) => {
    if (processingId) return;
    
    if (!window.confirm('確定要撤回這個報價嗎？')) return;

    setProcessingId(offerId);
    setError(null);

    try {
      const result = await withdrawOffer(offerId);

      if (!result.success) {
        setError(result.error || '撤回失敗');
        setProcessingId(null);
        return;
      }

      onOfferUpdated();
      setProcessingId(null);
    } catch (err: any) {
      console.error('[OffersList] Error:', err);
      setError('發生錯誤，請稍後再試');
      setProcessingId(null);
    }
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          {isBuyer ? '還沒有人報價' : '你還沒有提交報價'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Toast */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Email Warning Toast */}
      {emailWarning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-amber-700">{emailWarning}</p>
            <p className="text-xs text-amber-600 mt-1">對方仍可在「我的通知」中看到這則訊息。</p>
          </div>
          <button onClick={() => setEmailWarning(null)} className="text-amber-400 hover:text-amber-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {offers.map((offer) => {
        const statusDisplay = getOfferStatusDisplay(offer.status);
        const isProcessing = processingId === offer.id;
        const isPending = offer.status === 'pending';

        return (
          <div 
            key={offer.id}
            className={`
              border rounded-xl overflow-hidden transition-all
              ${isPending ? 'border-orange-200 bg-white' : 'border-gray-200 bg-gray-50'}
            `}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              {/* 代購者資訊 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                  {offer.shopper_avatar ? (
                    <img src={offer.shopper_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-orange-600 font-bold">
                      {offer.shopper_name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {offer.shopper_name || '代購者'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(offer.created_at).toLocaleString('zh-TW', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* 狀態標籤 */}
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusDisplay.className}`}>
                {statusDisplay.text}
              </span>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* 報價金額 */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-orange-600">
                  {formatAmount(offer.amount, offer.currency)}
                </span>
              </div>

              {/* 備註 */}
              {offer.message && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {offer.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              {isPending && (
                <div className="flex gap-2">
                  {isBuyer ? (
                    // 買家：接受/拒絕
                    <>
                      <button
                        onClick={() => handleRespond(offer.id, 'reject')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        拒絕
                      </button>
                      <button
                        onClick={() => handleRespond(offer.id, 'accept')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            處理中
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            接受並開始對話
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    // 代購者：撤回
                    <button
                      onClick={() => handleWithdraw(offer.id)}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 border border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {isProcessing ? '撤回中...' : '撤回報價'}
                    </button>
                  )}
                </div>
              )}

              {/* 已接受狀態：顯示聊天入口 */}
              {offer.status === 'accepted' && isBuyer && (
                <button
                  onClick={() => router.push(`/chat?target=${offer.shopper_id}&source_type=wish_request&source_id=${offer.wish_id}`)}
                  className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  繼續對話
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


