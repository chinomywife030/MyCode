'use client';

import { useState, useEffect } from 'react';

export default function IntroModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 檢查 localStorage，如果是第一次來，就顯示介紹
    const hasSeenIntro = localStorage.getItem('bangbuy_intro_seen');
    if (!hasSeenIntro) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // 記錄已經看過，下次不再顯示
    localStorage.setItem('bangbuy_intro_seen', 'true');
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const steps = [
    {
      title: "👋 歡迎來到 BangBuy",
      desc: "連結全球留學生與買家的代購平台。讓好物不浪費，旅費賺飽飽！",
      // 範例圖：一群朋友/社群
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "🛍️ 我是買家：發布許願",
      desc: "想要日本的零食？韓國的美妝？發布許願單，讓當地的留學生幫你帶回來！",
      // 範例圖：購物/逛街
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "✈️ 我是留學生：接單賺旅費",
      desc: "要回國了嗎？順路接單幫帶，賺取額外收入補貼機票錢，簡單又方便。",
      // 範例圖：飛機/旅行
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "🔒 安全交易 & 信用評價",
      desc: "透明的評價系統與安全的交易流程，讓每一次的代購委託都令人安心。",
      // 範例圖：握手/信任
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80"
    }
  ];

  if (!isOpen) return null;

  return (
    // 提高 z-index 確保蓋在所有內容之上
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
        
        {/* 右上角關閉按鈕 */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/20 text-white hover:bg-black/40 rounded-full transition backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 圖片區 (佔據上半部) */}
        <div className="relative h-64 w-full bg-gray-100">
          <img 
            src={steps[step].image} 
            alt={steps[step].title}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
          {/* 圖片下方的漸層遮罩，讓文字銜接更自然 */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        {/* 內容區 */}
        <div className="px-8 pb-8 pt-2 text-center flex-grow flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-800 mb-3 transition-all duration-300">
              {steps[step].title}
            </h2>
            <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
              {steps[step].desc}
            </p>
          </div>

          <div>
            {/* 進度條 */}
            <div className="flex justify-center gap-2 mt-6 mb-6">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}
                />
              ))}
            </div>

            {/* 按鈕群 */}
            <div className="flex gap-3">
              {step === 0 ? (
                <button 
                  onClick={handleClose} 
                  className="flex-1 py-3 text-gray-400 font-bold hover:text-gray-600 transition text-sm"
                >
                  跳過介紹
                </button>
              ) : (
                <button 
                  onClick={handlePrev} 
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition text-sm"
                >
                  ← 上一步
                </button>
              )}

              <button 
                onClick={handleNext}
                className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300 transition active:scale-95 text-sm"
              >
                {step === steps.length - 1 ? "開始探索 🚀" : "下一步 →"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}