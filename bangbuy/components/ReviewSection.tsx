'use client';

import StarRating from './StarRating';

// 🎨 假資料：評價列表
const MOCK_REVIEWS = [
  {
    id: 1,
    reviewerName: '小明',
    reviewerAvatar: 'https://i.pravatar.cc/150?img=11',
    rating: 5,
    comment: '非常好的合作體驗！商品準時送達，溝通順暢，值得信賴的代購者。',
    willCooperateAgain: true,
    createdAt: '2 天前',
  },
  {
    id: 2,
    reviewerName: 'Alice',
    reviewerAvatar: 'https://i.pravatar.cc/150?img=12',
    rating: 5,
    comment: '超級推薦！幫我買到了限定商品，包裝仔細，下次還會再找他。',
    willCooperateAgain: true,
    createdAt: '5 天前',
  },
  {
    id: 3,
    reviewerName: '阿華',
    reviewerAvatar: 'https://i.pravatar.cc/150?img=13',
    rating: 4,
    comment: '整體不錯，商品品質良好，但等待時間稍長。',
    willCooperateAgain: true,
    createdAt: '1 週前',
  },
  {
    id: 4,
    reviewerName: 'Sarah',
    reviewerAvatar: 'https://i.pravatar.cc/150?img=14',
    rating: 5,
    comment: '很棒的代購服務，價格合理，態度親切，會繼續支持！',
    willCooperateAgain: true,
    createdAt: '2 週前',
  },
  {
    id: 5,
    reviewerName: '小美',
    reviewerAvatar: 'https://i.pravatar.cc/150?img=15',
    rating: 4,
    comment: '商品符合描述，送貨速度可以，整體滿意。',
    willCooperateAgain: false,
    createdAt: '3 週前',
  },
];

interface ReviewSectionProps {
  // 可選：如果未來要傳入真實資料
  reviews?: typeof MOCK_REVIEWS;
}

export default function ReviewSection({ reviews = MOCK_REVIEWS }: ReviewSectionProps) {
  // 🎨 計算平均評分（使用假資料）
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const totalReviews = reviews.length;

  return (
    <div className="space-y-6">
      {/* A. 平均評分顯示 */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">平均評分</p>
            <div className="flex items-center gap-3">
              <span className="text-5xl font-bold text-orange-600">
                {averageRating.toFixed(1)}
              </span>
              <div>
                <StarRating rating={Math.round(averageRating)} size="md" />
                <p className="text-sm text-gray-600 mt-1">
                  {totalReviews} 則評價
                </p>
              </div>
            </div>
          </div>
          
          {/* 評分分布（簡化版） */}
          <div className="flex flex-col gap-1 text-sm">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter(r => r.rating === star).length;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-gray-600 w-8">{star} ★</span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* B. 評價列表 */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          所有評價 ({totalReviews})
        </h3>
        
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">尚無評價</h4>
            <p className="text-sm text-gray-500">完成交易後就可以收到評價</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* 評價者頭像 */}
                  <img
                    src={review.reviewerAvatar}
                    alt={review.reviewerName}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  
                  {/* 評價內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {review.reviewerName}
                        </h4>
                        <p className="text-xs text-gray-500">{review.createdAt}</p>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {review.comment}
                    </p>
                    
                    {review.willCooperateAgain && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        願意再次合作
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 提示 */}
      <p className="text-xs text-gray-400 text-center py-4">
        💡 這是 UI 原型，使用假資料展示
      </p>
    </div>
  );
}












