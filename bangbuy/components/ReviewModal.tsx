'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewModalProps {
  orderId: string;
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ orderId, targetId, targetName, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('請先登入');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('reviews').insert([
      {
        order_id: orderId,
        reviewer_id: user.id,
        target_id: targetId,
        rating,
        comment,
      },
    ]);

    if (error) {
      alert('評價失敗：' + error.message);
      setLoading(false);
    } else {
      alert('評價已送出');
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">評價 {targetName}</h3>
          <p className="text-gray-500 text-sm text-center mb-6">這次的合作體驗如何？</p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-4xl transition transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                aria-label={`給 ${star} 星`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 mb-4"
            rows={3}
            placeholder="寫下你的評價...(選填)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">取消</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? '送出中...' : '送出評價'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
