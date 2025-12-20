/**
 * 🎓 新手歡迎教學
 * 
 * 使用者第一次打開網站時顯示的簡單教學流程
 * 採用半透明浮層樣式，低干擾、高理解
 */

'use client';

import { useState, useEffect } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

const ONBOARDING_KEY = 'bangbuy_welcome_completed';

interface Step {
  title: string;
  description: string;
  icon: string;
}

export default function WelcomeOnboarding() {
  const { mode } = useUserMode();
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 檢查是否已完成教學
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        // 延遲 500ms 顯示，避免閃爍
        const timer = setTimeout(() => {
          setShow(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 不可用時不顯示
    }
  }, []);

  // 關閉教學
  const handleClose = () => {
    setShow(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // localStorage 不可用時忽略
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  // 上一步
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 跳過教學
  const handleSkip = () => {
    handleClose();
  };

  if (!show) return null;

  // 教學步驟（依模式切換）
  const steps: Step[] = mode === 'requester'
    ? [
        {
          title: '歡迎來到 BangBuy！',
          description: 'BangBuy 是一個跨境代購平台，讓你輕鬆購買全球商品',
          icon: '👋',
        },
        {
          title: '你目前是【買家】',
          description: '你可以發布需求，讓正在旅行的代購幫你購買商品',
          icon: '🛒',
        },
        {
          title: '如何開始？',
          description: '點擊「發布需求」按鈕，填寫你想買的商品和預算，代購會主動聯絡你',
          icon: '✨',
        },
        {
          title: '想賺外快？',
          description: '點擊右上角切換成【代購】，發布你的行程，幫他人代購賺收入',
          icon: '✈️',
        },
      ]
    : [
        {
          title: '歡迎來到 BangBuy！',
          description: 'BangBuy 是一個跨境代購平台，讓你利用旅行賺取收入',
          icon: '👋',
        },
        {
          title: '你目前是【代購】',
          description: '你可以發布行程，幫買家購買商品並賺取收入',
          icon: '✈️',
        },
        {
          title: '如何開始？',
          description: '點擊「發布行程」按鈕，填寫你的旅行計畫，買家會私訊你下單',
          icon: '✨',
        },
        {
          title: '想購買商品？',
          description: '點擊右上角切換成【買家】，發布需求，找人幫你代購',
          icon: '🛒',
        },
      ];

  const currentStepData = steps[currentStep];

  // 半透明浮層顏色（依模式切換）
  const overlayColor = mode === 'requester'
    ? 'rgba(59, 130, 246, 0.75)'  // 藍色
    : 'rgba(249, 115, 22, 0.75)';  // 橘色

  const borderColor = mode === 'requester'
    ? 'rgba(96, 165, 250, 0.3)'
    : 'rgba(251, 146, 60, 0.3)';

  return (
    <>
      {/* 半透明背景遮罩 */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease-out',
        }}
        onClick={handleSkip}
      >
        {/* 教學卡片 */}
        <div
          className="w-full max-w-md border"
          style={{
            backgroundColor: overlayColor,
            borderColor: borderColor,
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            animation: 'scaleIn 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 內容區 */}
          <div className="p-8">
            {/* Icon */}
            <div className="text-6xl text-center mb-6">
              {currentStepData.icon}
            </div>

            {/* 標題 */}
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              {currentStepData.title}
            </h2>

            {/* 描述 */}
            <p className="text-white/90 text-center leading-relaxed mb-8">
              {currentStepData.description}
            </p>

            {/* 進度指示器 */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: index === currentStep ? '32px' : '8px',
                    backgroundColor: index === currentStep
                      ? 'white'
                      : 'rgba(255, 255, 255, 0.3)',
                  }}
                />
              ))}
            </div>

            {/* 按鈕區 */}
            <div className="flex gap-3">
              {/* 上一步 / 跳過 */}
              <button
                onClick={currentStep === 0 ? handleSkip : handlePrev}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {currentStep === 0 ? '跳過' : '上一步'}
              </button>

              {/* 下一步 / 開始使用 */}
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'white',
                  color: mode === 'requester' ? '#2563eb' : '#ea580c',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                {currentStep === steps.length - 1 ? '開始使用' : '下一步'}
              </button>
            </div>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="關閉教學"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 動畫 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}




