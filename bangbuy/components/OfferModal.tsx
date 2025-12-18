'use client';

/**
 * 🏷️ OfferModal - 報價彈窗
 * 取代 window.prompt，提供完整的報價表單
 */

import { useState } from 'react';
import { createOffer } from '@/lib/offers';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (offerId: string, emailSent?: boolean) => void;
  wishId: string;
  wishTitle: string;
  wishBudget: number;
  currency?: string;
}

export default function OfferModal({
  isOpen,
  onClose,
  onSuccess,
  wishId,
  wishTitle,
  wishBudget,
  currency = 'TWD',
}: OfferModalProps) {
  const [amount, setAmount] = useState<string>(wishBudget.toString());
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('請輸入有效的報價金額');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createOffer({
        wishId,
        amount: numAmount,
        message: message.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || '報價失敗，請稍後再試');
        setIsSubmitting(false);
        return;
      }

      // 成功，傳遞 emailSent 狀態給父組件
      onSuccess(result.offerId!, result.emailSent);
    } catch (err: any) {
      console.error('[OfferModal] Error:', err);
      setError('發生錯誤，請稍後再試');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setAmount(wishBudget.toString());
    setMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
          <h2 className="text-lg font-bold text-white">我要接單報價</h2>
          <p className="text-white/80 text-sm mt-1 truncate">
            {wishTitle}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 預算參考 */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-700">買家預算</span>
              <span className="text-lg font-bold text-orange-600">
                {currency === 'TWD' ? 'NT$' : currency} {wishBudget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 報價金額 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              報價金額 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                {currency === 'TWD' ? 'NT$' : currency}
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-bold"
                placeholder="輸入金額"
                min="1"
                required
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              含代購費、運費等所有費用的總報價
            </p>
          </div>

          {/* 備註 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              備註說明 <span className="text-gray-400 font-normal">(選填)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              rows={3}
              placeholder="例如：包含國際運費、預計到貨時間..."
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {message.length}/500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>送出中...</span>
                </>
              ) : (
                '送出報價'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
