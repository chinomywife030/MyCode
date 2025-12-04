'use client';
import { useState } from 'react';

interface Wish {
  id?: string;
  title: string;
  budget: number;
  images?: string[];
}

interface OfferModalProps {
  wish: Wish;
  onClose: () => void;
  onConfirm: (price: number) => void;
}

export default function OfferModal({ wish, onClose, onConfirm }: OfferModalProps) {
  const [price, setPrice] = useState<string>(wish.budget.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) return alert('請輸入有效的金額');
    onConfirm(numPrice);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        
        {/* 標題區 */}
        <div className="bg-orange-500 p-4 text-white text-center relative">
          <h3 className="text-lg font-bold">💰 我要報價接單</h3>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* 商品資訊 */}
          <div className="flex gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden shrink-0">
              {wish.images?.[0] ? <img src={wish.images[0]} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-lg">🎁</div>}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-500">目標商品</p>
              <p className="font-bold text-gray-800 truncate">{wish.title}</p>
              <p className="text-xs text-orange-600">買家預算: ${wish.budget.toLocaleString()}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              您的報價金額 (含代購費/運費)
            </label>
            <div className="relative mb-6">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg font-bold text-gray-800"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                取消
              </button>
              <button 
                type="submit"
                className="flex-[2] py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition active:scale-95"
              >
                確認送出
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}