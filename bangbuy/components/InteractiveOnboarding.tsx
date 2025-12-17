/**
 * 🎯 箭頭式操作引導（Guided Spotlight）
 * 
 * 使用 4 個 div 遮罩實現真正的挖洞
 * 目標區域完全沒有覆蓋，可直接點擊
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserMode } from '@/components/UserModeProvider';

const ONBOARDING_KEY = 'bangbuy_spotlight_completed';
const DEBUG = true; // 開啟 debug 模式（測試完請關閉）

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

export default function InteractiveOnboarding() {
  const { mode } = useUserMode();
  const [show, setShow] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // 計算目標按鈕的位置
  const calculateTargetRect = useCallback(() => {
    const targetEl = document.querySelector('[aria-label*="當前身份"]') as HTMLElement;
    if (!targetEl) {
      if (DEBUG) console.log('❌ Target button not found');
      return null;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 6; // 挖洞區域比按鈕大一點
    
    const computed: TargetRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding,
      right: rect.right + padding,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };

    if (DEBUG) {
      console.log('🎯 Target rect:', computed);
      console.log('🎯 Window size:', window.innerWidth, window.innerHeight);
    }

    return computed;
  }, []);

  // 更新目標位置
  const updateTargetRect = useCallback(() => {
    const rect = calculateTargetRect();
    if (rect) {
      setTargetRect(rect);
      setIsMobile(window.innerWidth <= 768);
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [calculateTargetRect]);

  // 完成教學
  const completeTour = useCallback(() => {
    if (DEBUG) console.log('✅ Tour completed');
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
        // 延遲顯示，確保 DOM 已渲染
        const timer = setTimeout(() => {
          updateTargetRect();
          // 使用 requestAnimationFrame double-tick 確保字體載入
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              updateTargetRect();
              setShow(true);
            });
          });
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 不可用時不顯示
    }
  }, [updateTargetRect]);

  // 監聽 resize / scroll
  useEffect(() => {
    if (!show) return;

    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [show, updateTargetRect]);

  // 提升目標按鈕 z-index + 監聽點擊
  useEffect(() => {
    if (!show) return;

    const targetEl = document.querySelector('[aria-label*="當前身份"]') as HTMLElement;
    if (!targetEl) {
      if (DEBUG) console.log('❌ Target element not found');
      return;
    }

    // 保存原始樣式
    const originalPosition = targetEl.style.position;
    const originalZIndex = targetEl.style.zIndex;

    // 提升 z-index 讓按鈕在遮罩之上
    targetEl.style.position = 'relative';
    targetEl.style.zIndex = '10002'; // 高於遮罩 (10000) 和發光邊框 (10001)

    if (DEBUG) {
      console.log('🎯 Target z-index set to 10002');
      console.log('🎯 Target element:', targetEl);
    }

    const handleClick = () => {
      if (DEBUG) console.log('🎯 Target clicked!');
      completeTour();
    };

    targetEl.addEventListener('click', handleClick);

    return () => {
      // 恢復原始樣式
      targetEl.style.position = originalPosition;
      targetEl.style.zIndex = originalZIndex;
      targetEl.removeEventListener('click', handleClick);
    };
  }, [show, completeTour]);

  if (!show || !targetRect) return null;

  // 文案依模式切換
  const tooltipText = mode === 'requester' 
    ? '點這裡切換成接單模式' 
    : '點這裡切換成買家模式';

  // 計算箭頭終點位置（指向按鈕頂部中心）
  const arrowEndY = targetRect.top;
  const arrowEndX = targetRect.centerX;
  
  // 箭頭起點（文案位置）
  const arrowStartY = isMobile 
    ? targetRect.bottom + 50  // 手機：箭頭從下方開始
    : targetRect.top - 50;    // 桌機：箭頭從上方開始

  return (
    <>
      {/* ===== 4 個遮罩 div 實現真正的挖洞 ===== */}
      
      {/* 上方遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: targetRect.top,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      />
      
      {/* 左側遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: 0,
          width: targetRect.left,
          height: targetRect.height,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      />
      
      {/* 右側遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left + targetRect.width,
          right: 0,
          height: targetRect.height,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      />
      
      {/* 下方遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top + targetRect.height,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      />

      {/* ===== 發光邊框（不阻擋點擊）===== */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: '20px',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 0 20px 4px rgba(255, 255, 255, 0.3)',
          zIndex: 10001,
          pointerEvents: 'none', // 不阻擋點擊
          animation: 'glow 2s ease-in-out infinite',
        }}
      />

      {/* ===== 箭頭 + 文案（不阻擋點擊）===== */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10001,
          pointerEvents: 'none', // 不阻擋點擊
        }}
      >
        {/* SVG 箭頭 */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#60a5fa" />
            </marker>
          </defs>
          
          {isMobile ? (
            // 手機：箭頭從下方指向上方
            <line
              x1={arrowEndX}
              y1={arrowStartY}
              x2={arrowEndX}
              y2={targetRect.bottom + 8}
              stroke="#60a5fa"
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            />
          ) : (
            // 桌機：箭頭從上方指向下方
            <line
              x1={arrowEndX}
              y1={arrowStartY}
              x2={arrowEndX}
              y2={targetRect.top - 8}
              stroke="#60a5fa"
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            />
          )}
        </svg>

        {/* 文案 */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? `${arrowStartY + 10}px` : `${arrowStartY - 30}px`,
            left: `${arrowEndX}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <p
            style={{
              color: 'white',
              fontWeight: 600,
              fontSize: isMobile ? '15px' : '14px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {tooltipText}
          </p>
        </div>
      </div>

      {/* Debug 模式 */}
      {DEBUG && (
        <>
          <div
            style={{
              position: 'fixed',
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              border: '2px dashed red',
              zIndex: 10002,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: targetRect.centerY - 4,
              left: targetRect.centerX - 4,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'red',
              zIndex: 10002,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* 動畫 */}
      <style jsx global>{`
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px 4px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 30px 8px rgba(255, 255, 255, 0.5);
          }
        }
      `}</style>
    </>
  );
}
