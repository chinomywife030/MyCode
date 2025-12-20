'use client';

import { useState } from 'react';
import ReviewModal from './ReviewModal';

// 🎨 Uber 式評價狀態（假資料模擬）
interface OrderReviewStatus {
  orderId: string;
  canCurrentUserReview: boolean;
  hasCurrentUserReviewed: boolean;
  hasOtherSideReviewed: boolean;
  otherSideName: string;
  otherSideType: 'buyer' | 'shopper';
}

interface UberStyleReviewSectionProps {
  // 🎨 使用假資料，不接真實資料
  orderStatus?: OrderReviewStatus;
}

export default function UberStyleReviewSection({ 
  orderStatus 
}: UberStyleReviewSectionProps) {
  // 🎨 純 UI state：模擬評價狀態
  const [reviewStatus, setReviewStatus] = useState<OrderReviewStatus>(
    orderStatus || {
      orderId: 'demo-order-123',
      canCurrentUserReview: true,
      hasCurrentUserReviewed: false,
      hasOtherSideReviewed: false,
      otherSideName: '小明',
      otherSideType: 'shopper' as const
    }
  );

  // 🎨 純 UI state：評價 Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // 🎨 處理評價送出（純 UI 更新）
  const handleReviewSubmitted = () => {
    console.log('✅ Uber 式評價已送出，更新 UI 狀態');
    setReviewStatus(prev => ({
      ...prev,
      hasCurrentUserReviewed: true
    }));
  };

  // 如果不能評價，不顯示
  if (!reviewStatus.canCurrentUserReview) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-orange-100">
      <div className="flex items-start gap-4">
        {/* 圖示 */}
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            評價 {reviewStatus.otherSideType === 'buyer' ? '買家' : '代購者'}
          </h3>
          
          {/* 主按鈕 */}
          {reviewStatus.hasCurrentUserReviewed ? (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-500 font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已評價 ✓
            </button>
          ) : (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-sm hover:shadow-md mb-3"
            >
              評價 {reviewStatus.otherSideName}
            </button>
          )}

          {/* 狀態提示 */}
          <div className="flex items-center gap-2 text-sm">
            {reviewStatus.hasOtherSideReviewed ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-semibold">
                  {reviewStatus.otherSideName} 已對你做出評價
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600">
                  {reviewStatus.otherSideName} 尚未評價你
                </span>
              </>
            )}
          </div>

          {/* 說明文字 */}
          {!reviewStatus.hasCurrentUserReviewed && (
            <p className="text-xs text-gray-500 mt-3">
              💡 評價有助於建立信任的社群，你的評價對其他使用者很重要
            </p>
          )}
        </div>
      </div>

      {/* 評價 Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        targetName={reviewStatus.otherSideName}
        targetType={reviewStatus.otherSideType}
        orderId={reviewStatus.orderId}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}










