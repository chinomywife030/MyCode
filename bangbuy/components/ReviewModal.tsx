'use client';

import { useState } from 'react';
import StarRating from './StarRating';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string; // 被評價者名稱
  targetType: 'buyer' | 'shopper'; // 被評價者類型
  orderId?: string; // 訂單 ID（可選）
  onReviewSubmitted?: () => void; // 評價送出後的回調（可選）
}

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  targetName, 
  targetType,
  orderId,
  onReviewSubmitted 
}: ReviewModalProps) {
  // 🎨 純 UI state：評價表單資料
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [willCooperateAgain, setWillCooperateAgain] = useState(false);

  // 🎨 處理送出評價（純 UI，只 console.log）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('請選擇評分');
      return;
    }
    
    const reviewData = {
      rating,
      comment,
      willCooperateAgain,
      targetName,
      targetType,
      orderId: orderId || null,
      timestamp: new Date().toISOString()
    };
    
    console.log('📝 評價資料（純前端，Uber 式）:', reviewData);
    
    // 通知父組件評價已送出
    if (onReviewSubmitted) {
      onReviewSubmitted();
    }
    
    alert(`✅ 評價已送出！\n評分：${rating} 星\n對方：${targetName}\n（目前只是 UI prototype）`);
    
    // 重置表單
    setRating(0);
    setComment('');
    setWillCooperateAgain(false);
    
    // 關閉 Modal
    onClose();
  };

  // 🎨 處理關閉 Modal
  const handleClose = () => {
    setRating(0);
    setComment('');
    setWillCooperateAgain(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">留下評價</h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                  aria-label="關閉"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500">
                評價 {targetType === 'buyer' ? '買家' : '代購者'}：
                <span className="font-semibold text-gray-700"> {targetName}</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* A. 星星評分區 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  評分 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <StarRating
                    rating={rating}
                    onRatingChange={setRating}
                    size="lg"
                    interactive={true}
                  />
                  {rating > 0 && (
                    <span className="text-2xl font-bold text-orange-600">
                      {rating}.0
                    </span>
                  )}
                </div>
                {rating === 0 && (
                  <p className="text-xs text-gray-500 mt-2">點擊星星選擇評分</p>
                )}
              </div>

              {/* B. 評語 textarea */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  評語
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="寫下你的合作心得…"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {comment.length} / 500 字
                </p>
              </div>

              {/* C. 小選項 */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={willCooperateAgain}
                    onChange={(e) => setWillCooperateAgain(e.target.checked)}
                    className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">
                    願意再次合作
                  </span>
                </label>
              </div>

              {/* D. 按鈕 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition shadow-sm hover:shadow-md"
                >
                  送出評價
                </button>
              </div>
            </form>

            {/* Footer 提示 */}
            <div className="px-6 pb-6">
              <p className="text-xs text-gray-400 text-center">
                💡 這是 UI 原型，評價不會寫入資料庫
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
