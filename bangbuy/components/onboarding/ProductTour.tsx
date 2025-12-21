'use client';

/**
 * 🎯 ProductTour - 產品導覽組件
 * 
 * 功能：
 * - 半透明遮罩 + 高亮目標元素
 * - 箭頭指向目標
 * - 分步導覽（上一步/下一步/跳過）
 * - 桌機/手機不同步驟
 * - 動態計算位置（resize 也正確）
 * - localStorage 記錄已完成
 * - 全域單例鎖（防止重複 instance）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ============================================
// 全域單例鎖 - 確保任何時刻只有一個 Tour instance
// ============================================
let globalTourInstanceId: string | null = null;
let tourMountCount = 0; // DEBUG: 追蹤 mount 次數

// DEBUG 開關（上線前設為 false）
const DEBUG_TOUR = process.env.NODE_ENV === 'development';

// ============================================
// Types
// ============================================

export interface TourStep {
  /** 目標元素選擇器（使用 data-tour 屬性）*/
  targetSelector: string;
  /** 步驟標題 */
  title: string;
  /** 步驟描述 */
  description: string;
  /** Tooltip 偏好位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 是否為買家模式步驟 */
  buyerOnly?: boolean;
  /** 是否為代購模式步驟 */
  shopperOnly?: boolean;
}

interface ProductTourProps {
  /** 是否開啟導覽 */
  isOpen: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 完成回調 */
  onComplete?: () => void;
  /** 當前用戶模式 */
  mode?: 'requester' | 'shopper';
  /** 強制使用桌機/手機版（用於測試，預設自動偵測）*/
  variant?: 'desktop' | 'mobile';
}

// ============================================
// Tour Steps Configuration
// ============================================

const DESKTOP_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="mode-toggle"]',
    title: '切換身分',
    description: '點擊這裡可以在「買家」和「代購者」模式之間切換，看到不同的內容。',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="search-bar"]',
    title: '搜尋商品',
    description: '輸入關鍵字搜尋需求或行程，快速找到你要的資訊。',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="filter-btn"]',
    title: '進階篩選',
    description: '使用篩選功能，依國家、日期等條件縮小搜尋範圍。',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="primary-cta"]',
    title: '發布需求/行程',
    description: '點擊這裡發布你的代購需求或行程，開始使用 BangBuy！',
    placement: 'bottom',
    buyerOnly: true,
  },
  {
    targetSelector: '[data-tour="primary-cta"]',
    title: '發布行程',
    description: '作為代購者，發布你的旅行行程，讓買家知道你可以幫忙代購。',
    placement: 'bottom',
    shopperOnly: true,
  },
];

const MOBILE_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="mode-toggle"]',
    title: '切換身分',
    description: '點擊這裡切換「買家」或「代購者」模式。',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="primary-cta"]',
    title: '發布需求或行程',
    description: '點這裡發布你的需求（買家）或行程（代購者）。',
    placement: 'top',
  },
  {
    targetSelector: '[data-tour="bottom-nav"]',
    title: '底部導覽',
    description: '使用底部選單快速切換頁面：首頁、訊息、會員中心。',
    placement: 'top',
  },
];

// ============================================
// Helper Functions
// ============================================

function getScrollOffset(): { x: number; y: number } {
  return {
    x: window.scrollX || window.pageXOffset || 0,
    y: window.scrollY || window.pageYOffset || 0,
  };
}

function calculateTooltipPosition(
  targetRect: DOMRect,
  tooltipRect: { width: number; height: number },
  placement: 'top' | 'bottom' | 'left' | 'right',
  padding: number = 12
): { top: number; left: number; actualPlacement: 'top' | 'bottom' | 'left' | 'right' } {
  const scroll = getScrollOffset();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let top = 0;
  let left = 0;
  let actualPlacement = placement;
  
  // 計算各位置
  const positions = {
    bottom: {
      top: targetRect.bottom + scroll.y + padding,
      left: targetRect.left + scroll.x + (targetRect.width - tooltipRect.width) / 2,
    },
    top: {
      top: targetRect.top + scroll.y - tooltipRect.height - padding,
      left: targetRect.left + scroll.x + (targetRect.width - tooltipRect.width) / 2,
    },
    right: {
      top: targetRect.top + scroll.y + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.right + scroll.x + padding,
    },
    left: {
      top: targetRect.top + scroll.y + (targetRect.height - tooltipRect.height) / 2,
      left: targetRect.left + scroll.x - tooltipRect.width - padding,
    },
  };
  
  // 嘗試偏好位置
  const pos = positions[placement];
  
  // 檢查是否超出邊界
  const exceedsBottom = pos.top + tooltipRect.height > scroll.y + viewportHeight;
  const exceedsTop = pos.top < scroll.y;
  const exceedsRight = pos.left + tooltipRect.width > viewportWidth;
  const exceedsLeft = pos.left < 0;
  
  if (placement === 'bottom' && exceedsBottom) {
    actualPlacement = 'top';
  } else if (placement === 'top' && exceedsTop) {
    actualPlacement = 'bottom';
  } else if (placement === 'right' && exceedsRight) {
    actualPlacement = 'left';
  } else if (placement === 'left' && exceedsLeft) {
    actualPlacement = 'right';
  }
  
  const finalPos = positions[actualPlacement];
  top = finalPos.top;
  left = Math.max(8, Math.min(finalPos.left, viewportWidth - tooltipRect.width - 8));
  
  return { top, left, actualPlacement };
}

// ============================================
// ProductTour Component
// ============================================

export default function ProductTour({
  isOpen,
  onClose,
  onComplete,
  mode = 'requester',
  variant,
}: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPlacement, setArrowPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const instanceIdRef = useRef<string>(`tour-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const MAX_RETRIES = 10;
  
  // DEBUG: 追蹤 mount
  useEffect(() => {
    tourMountCount++;
    const myMountId = tourMountCount;
    if (DEBUG_TOUR) {
      console.log(`[ProductTour] MOUNT #${myMountId}`, {
        instanceId: instanceIdRef.current,
        isOpen,
        globalTourInstanceId,
      });
    }
    return () => {
      if (DEBUG_TOUR) {
        console.log(`[ProductTour] UNMOUNT #${myMountId}`);
      }
    };
  }, []);
  
  // 🔒 全域單例鎖
  useEffect(() => {
    if (!isOpen) {
      // 釋放鎖
      if (globalTourInstanceId === instanceIdRef.current) {
        if (DEBUG_TOUR) console.log('[ProductTour] 釋放鎖');
        globalTourInstanceId = null;
      }
      return;
    }
    
    // 嘗試獲取鎖
    if (globalTourInstanceId && globalTourInstanceId !== instanceIdRef.current) {
      // 已有其他 instance，不渲染
      if (DEBUG_TOUR) console.warn('[ProductTour] 已有其他 Tour instance 正在運行，跳過此 instance');
      setIsLocked(true);
      return;
    }
    
    // 獲取鎖成功
    globalTourInstanceId = instanceIdRef.current;
    setIsLocked(false);
    if (DEBUG_TOUR) console.log('[ProductTour] 獲取鎖成功，開始導覽');
    
    return () => {
      // cleanup: 釋放鎖
      if (globalTourInstanceId === instanceIdRef.current) {
        globalTourInstanceId = null;
      }
    };
  }, [isOpen]);
  
  // 取得當前步驟列表
  const getFilteredSteps = useCallback(() => {
    const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;
    return steps.filter(step => {
      if (step.buyerOnly && mode !== 'requester') return false;
      if (step.shopperOnly && mode !== 'shopper') return false;
      return true;
    });
  }, [isMobile, mode]);
  
  const filteredSteps = getFilteredSteps();
  const currentStep = filteredSteps[stepIndex];
  const totalSteps = filteredSteps.length;
  
  // 偵測裝置類型
  useEffect(() => {
    setMounted(true);
    
    const checkDevice = () => {
      if (variant) {
        setIsMobile(variant === 'mobile');
      } else {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [variant]);
  
  // 尋找並定位目標元素
  const findAndPositionTarget = useCallback(() => {
    if (!currentStep || !isOpen || isLocked) {
      setIsReady(false);
      return;
    }
    
    const targetEl = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    
    // 檢查元素是否存在且可見
    const isElementVisible = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      // 檢查 offsetParent（display: none 時為 null）
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
      // 檢查尺寸
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      return true;
    };
    
    if (!targetEl || !isElementVisible(targetEl)) {
      // 重試機制
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        if (DEBUG_TOUR) {
          console.log(`[ProductTour] 等待元素: ${currentStep.targetSelector} (重試 ${retryCountRef.current}/${MAX_RETRIES})`);
        }
        setTimeout(findAndPositionTarget, 200);
      } else {
        // 跳過此步驟
        console.warn(`[ProductTour] 找不到元素或元素不可見: ${currentStep.targetSelector}，跳過此步驟`);
        if (stepIndex < totalSteps - 1) {
          setStepIndex(prev => prev + 1);
        } else {
          handleComplete();
        }
      }
      return;
    }
    
    if (DEBUG_TOUR) {
      console.log(`[ProductTour] 找到元素: ${currentStep.targetSelector}`, {
        stepIndex,
        totalSteps,
        title: currentStep.title,
      });
    }
    
    retryCountRef.current = 0;
    
    // 滾動到目標元素
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 延遲計算位置（等待滾動完成）
    setTimeout(() => {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
      
      // 計算 tooltip 位置
      const tooltipRect = {
        width: Math.min(320, window.innerWidth - 32),
        height: 180, // 預估高度
      };
      
      const { top, left, actualPlacement } = calculateTooltipPosition(
        rect,
        tooltipRect,
        currentStep.placement || 'bottom'
      );
      
      setTooltipPosition({ top, left });
      setArrowPlacement(actualPlacement);
      setIsReady(true);
    }, 300);
  }, [currentStep, isOpen, stepIndex, totalSteps]);
  
  // 監聽步驟變化
  useEffect(() => {
    findAndPositionTarget();
  }, [findAndPositionTarget]);
  
  // 監聽視窗大小變化
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => {
      findAndPositionTarget();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, findAndPositionTarget]);
  
  // 禁止背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // 導覽控制
  const handleNext = () => {
    if (stepIndex < totalSteps - 1) {
      setIsReady(false);
      setStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handlePrev = () => {
    if (stepIndex > 0) {
      setIsReady(false);
      setStepIndex(prev => prev - 1);
    }
  };
  
  const handleSkip = () => {
    localStorage.setItem('bb_tour_v1_done', 'true');
    onClose();
  };
  
  const handleComplete = () => {
    localStorage.setItem('bb_tour_v1_done', 'true');
    onComplete?.();
    onClose();
  };
  
  // 不渲染條件
  if (!isOpen || !mounted || !currentStep || isLocked) return null;
  
  // 計算高亮框位置
  const scroll = getScrollOffset();
  const highlightStyle = targetRect ? {
    top: targetRect.top + scroll.y - 8,
    left: targetRect.left + scroll.x - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
  } : null;
  
  // 箭頭 SVG
  const Arrow = ({ placement }: { placement: 'top' | 'bottom' | 'left' | 'right' }) => {
    const baseClass = 'absolute w-4 h-4 fill-white drop-shadow-lg';
    switch (placement) {
      case 'bottom':
        return (
          <svg className={`${baseClass} -top-2 left-1/2 -translate-x-1/2`} viewBox="0 0 16 8">
            <path d="M8 0L16 8H0L8 0Z" />
          </svg>
        );
      case 'top':
        return (
          <svg className={`${baseClass} -bottom-2 left-1/2 -translate-x-1/2 rotate-180`} viewBox="0 0 16 8">
            <path d="M8 0L16 8H0L8 0Z" />
          </svg>
        );
      case 'left':
        return (
          <svg className={`${baseClass} -right-2 top-1/2 -translate-y-1/2 rotate-90`} viewBox="0 0 16 8">
            <path d="M8 0L16 8H0L8 0Z" />
          </svg>
        );
      case 'right':
        return (
          <svg className={`${baseClass} -left-2 top-1/2 -translate-y-1/2 -rotate-90`} viewBox="0 0 16 8">
            <path d="M8 0L16 8H0L8 0Z" />
          </svg>
        );
    }
  };
  
  const themeColor = mode === 'requester' ? 'blue' : 'orange';
  
  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* 半透明遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        onClick={handleSkip}
        style={{ backdropFilter: 'blur(2px)' }}
      />
      
      {/* 高亮框（鏤空效果）*/}
      {highlightStyle && isReady && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            ...highlightStyle,
            boxShadow: `
              0 0 0 4px ${themeColor === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(249, 115, 22, 0.5)'},
              0 0 0 9999px rgba(0, 0, 0, 0.6)
            `,
          }}
        />
      )}
      
      {/* Tooltip 卡片 */}
      {isReady && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-10 w-[calc(100vw-32px)] max-w-[320px]
            bg-white rounded-2xl shadow-2xl
            transform transition-all duration-300 ease-out
          `}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* 箭頭 */}
          <Arrow placement={arrowPlacement} />
          
          {/* 內容 */}
          <div className="p-5">
            {/* 進度指示 */}
            <div className="flex items-center justify-between mb-3">
              <span className={`
                text-xs font-bold px-2 py-1 rounded-full
                ${themeColor === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}
              `}>
                第 {stepIndex + 1} / {totalSteps} 步
              </span>
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                跳過教學
              </button>
            </div>
            
            {/* 標題 */}
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {currentStep.title}
            </h3>
            
            {/* 描述 */}
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              {currentStep.description}
            </p>
            
            {/* 按鈕區 */}
            <div className="flex items-center justify-between gap-3">
              {stepIndex > 0 ? (
                <button
                  onClick={handlePrev}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  上一步
                </button>
              ) : (
                <div className="flex-1" />
              )}
              
              <button
                onClick={handleNext}
                className={`
                  flex-1 py-2.5 px-4 text-sm font-bold text-white rounded-xl transition shadow-md
                  ${themeColor === 'blue' 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-orange-500 hover:bg-orange-600'}
                `}
              >
                {stepIndex === totalSteps - 1 ? '完成！' : '下一步'}
              </button>
            </div>
          </div>
          
          {/* 進度條 */}
          <div className="h-1 bg-gray-100 rounded-b-2xl overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${themeColor === 'blue' ? 'bg-blue-500' : 'bg-orange-500'}`}
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Loading 狀態 */}
      {!isReady && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`w-10 h-10 border-4 rounded-full animate-spin ${themeColor === 'blue' ? 'border-blue-500 border-t-transparent' : 'border-orange-500 border-t-transparent'}`} />
        </div>
      )}
    </div>,
    document.body
  );
}

