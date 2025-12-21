/**
 * ⚠️ DEPRECATED - 此組件已廢棄
 * 
 * 請使用 components/onboarding/ProductTour.tsx
 * 
 * 此組件保留但不再使用，避免雙重渲染問題。
 * 已於 2024-12-21 停用。
 * 
 * ---
 * 
 * 🎯 Coach Mark 新手引導（3 步驟）- 舊版
 * 
 * 平台設計原則：
 * - 一步只教一件事
 * - 箭頭必須準確指向可點擊元素
 * - 桌機與手機分開判斷位置
 * - 可點擊、可跳過，不鎖死畫面
 * 
 * 步驟：
 * Step 1：這裡切換你的身分（買家 / 代購者）
 * Step 2：點這裡發佈需求（或行程）
 * Step 3：有人回應後，點這裡開始對話
 * 
 * @deprecated 使用 ProductTour 替代
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

const ONBOARDING_KEY = 'bangbuy_coach_mark_v2';
const DEBUG = false; // 關閉 debug 模式

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
  centerX: number;
  centerY: number;
}

// 🎯 三步驟引導設定
interface CoachStep {
  id: number;
  selector: string;
  title: string;
  description: string;
  ariaLabel?: string;
}

const COACH_STEPS: CoachStep[] = [
  {
    id: 1,
    selector: '[aria-label*="當前身份"]',
    title: '切換身分',
    description: '點這裡切換你的身分：買家或代購者',
    ariaLabel: '當前身份',
  },
  {
    id: 2,
    selector: 'a[href="/create"], a[href="/trips/create"]',
    title: '發佈內容',
    description: '點這裡發佈你的需求或行程',
  },
  {
    id: 3,
    selector: 'button[title="通知"], a[href="/chat"]',
    title: '開始對話',
    description: '有人回應後，點這裡開始對話',
  },
];

export default function InteractiveOnboarding() {
  const { mode } = useUserMode();
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 取得當前步驟
  const step = COACH_STEPS[currentStep];

  // 計算目標元素的位置
  const calculateTargetRect = useCallback((selector: string) => {
    const targetEl = document.querySelector(selector) as HTMLElement;
    if (!targetEl) {
      if (DEBUG) console.log('❌ Target not found:', selector);
      return null;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 6;
    
    return {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding,
      right: rect.right + padding,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  }, []);

  // 更新目標位置
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const rect = calculateTargetRect(step.selector);
    if (rect) {
      setTargetRect(rect);
      setIsMobile(window.innerWidth <= 768);
    }
  }, [step, calculateTargetRect]);

  // 下一步
  const nextStep = useCallback(() => {
    if (currentStep < COACH_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // 完成教學
      setShow(false);
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        // localStorage 不可用時忽略
      }
    }
  }, [currentStep]);

  // 跳過教學
  const skipTour = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // localStorage 不可用時忽略
    }
  }, []);

  // 檢查是否已完成教學
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        const timer = setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setShow(true);
            });
          });
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 不可用時不顯示
    }
  }, []);

  // 當步驟改變時更新目標位置
  useEffect(() => {
    if (show) {
      updateTargetRect();
    }
  }, [show, currentStep, updateTargetRect]);

  // 監聽 resize / scroll
  useEffect(() => {
    if (!show) return;

    const handleUpdate = () => updateTargetRect();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [show, updateTargetRect]);

  // 提升目標元素 z-index
  useEffect(() => {
    if (!show || !step) return;

    const targetEl = document.querySelector(step.selector) as HTMLElement;
    if (!targetEl) return;

    const originalPosition = targetEl.style.position;
    const originalZIndex = targetEl.style.zIndex;

    targetEl.style.position = 'relative';
    targetEl.style.zIndex = '10002';

    return () => {
      targetEl.style.position = originalPosition;
      targetEl.style.zIndex = originalZIndex;
    };
  }, [show, step]);

  if (!show || !targetRect || !step) return null;

  // 計算箭頭位置
  const arrowEndX = targetRect.centerX;
  const arrowStartY = isMobile 
    ? targetRect.bottom + 60
    : targetRect.top - 60;

  return (
    <>
      {/* ===== 半透明遮罩（挖洞）===== */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: targetRect.top,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        }}
        onClick={skipTour}
      />
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: 0,
          width: targetRect.left,
          height: targetRect.height,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        }}
        onClick={skipTour}
      />
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left + targetRect.width,
          right: 0,
          height: targetRect.height,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        }}
        onClick={skipTour}
      />
      <div
        style={{
          position: 'fixed',
          top: targetRect.top + targetRect.height,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        }}
        onClick={skipTour}
      />

      {/* ===== 目標區域發光邊框 ===== */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: '12px',
          border: '2px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 0 20px 4px rgba(96, 165, 250, 0.4)',
          zIndex: 10001,
          pointerEvents: 'none',
          animation: 'coachGlow 2s ease-in-out infinite',
        }}
      />

      {/* ===== 箭頭 + 說明卡片 ===== */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10001,
          pointerEvents: 'none',
        }}
      >
        {/* SVG 箭頭 */}
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <marker id="coach-arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#60a5fa" />
            </marker>
          </defs>
          <line
            x1={arrowEndX}
            y1={arrowStartY}
            x2={arrowEndX}
            y2={isMobile ? targetRect.bottom + 8 : targetRect.top - 8}
            stroke="#60a5fa"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#coach-arrow)"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
          />
        </svg>

        {/* 說明卡片 */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? `${arrowStartY + 15}px` : `${arrowStartY - 100}px`,
            left: `${Math.max(20, Math.min(arrowEndX - 140, window.innerWidth - 300))}px`,
            pointerEvents: 'auto',
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-4 w-[280px] border border-gray-100">
            {/* 步驟指示器 */}
            <div className="flex items-center gap-2 mb-3">
              {COACH_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* 標題 */}
            <h4 className="text-sm font-bold text-gray-900 mb-1">
              {step.title}
            </h4>

            {/* 說明 */}
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              {step.description}
            </p>

            {/* 按鈕 */}
            <div className="flex items-center justify-between">
              <button
                onClick={skipTour}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                跳過
              </button>
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {currentStep < COACH_STEPS.length - 1 ? '下一步' : '完成'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 動畫 */}
      <style jsx global>{`
        @keyframes coachGlow {
          0%, 100% {
            box-shadow: 0 0 20px 4px rgba(96, 165, 250, 0.4);
          }
          50% {
            box-shadow: 0 0 30px 8px rgba(96, 165, 250, 0.6);
          }
        }
      `}</style>
    </>
  );
}
