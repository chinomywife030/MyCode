/**
 * 🖼️ ImageCarousel - 圖片輪播組件
 * 
 * - 原生 scroll-snap 實作（不需套件）
 * - 手機：touch swipe
 * - 桌面：拖曳滑動、箭頭按鈕、滾輪橫向滾動
 * - 防止外層 Link 點擊事件
 * - ⚡ 使用 next/image 優化圖片載入
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

interface ImageCarouselProps {
  images: string[];
  alt?: string;
  aspectRatio?: 'square' | '4/3' | '16/9';
  showCounter?: boolean;
  className?: string;
  onImageClick?: (index: number) => void;
  /** 是否為首張優先載入（首頁第一張卡片用） */
  priority?: boolean;
}

export default function ImageCarousel({
  images = [],
  alt = '商品圖片',
  aspectRatio = '4/3',
  showCounter = true,
  className = '',
  onImageClick,
  priority = false,
}: ImageCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // 拖曳狀態
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const dragState = useRef({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  // 檢測桌面環境
  useEffect(() => {
    const checkDesktop = () => {
      const isHover = window.matchMedia('(hover: hover)').matches;
      const isPointerFine = window.matchMedia('(pointer: fine)').matches;
      setIsDesktop(isHover && isPointerFine);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 計算當前索引
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollLeft, clientWidth } = containerRef.current;
    const newIndex = Math.round(scrollLeft / clientWidth);
    setCurrentIndex(newIndex);
  }, []);

  // 監聽滾動
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 滑動到指定圖片
  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current) return;
    
    const { clientWidth } = containerRef.current;
    containerRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth',
    });
  }, []);

  // 上一張
  const goToPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  }, [currentIndex, scrollToIndex]);

  // 下一張
  const goToNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex < images.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  }, [currentIndex, images.length, scrollToIndex]);

  // ===== 桌面拖曳功能 =====
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDesktop || !containerRef.current) return;
    
    dragState.current = {
      isDown: true,
      startX: e.pageX - containerRef.current.offsetLeft,
      startScrollLeft: containerRef.current.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
    setWasDragged(false);
  }, [isDesktop]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDown || !containerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = x - dragState.current.startX;
    
    // 移動超過 5px 才算拖曳
    if (Math.abs(walk) > 5) {
      dragState.current.moved = true;
      setWasDragged(true);
    }
    
    containerRef.current.scrollLeft = dragState.current.startScrollLeft - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragState.current.isDown = false;
    setIsDragging(false);
    
    // 延遲重置 wasDragged，讓 click 事件能判斷
    setTimeout(() => {
      setWasDragged(false);
    }, 100);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (dragState.current.isDown) {
      dragState.current.isDown = false;
      setIsDragging(false);
      setTimeout(() => setWasDragged(false), 100);
    }
  }, []);

  // ===== 滾輪橫向滾動 =====
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isDesktop || !containerRef.current) return;
    
    const container = containerRef.current;
    const { scrollWidth, clientWidth, scrollLeft } = container;
    
    // 只有可以滾動時才處理
    if (scrollWidth <= clientWidth) return;
    
    // 如果垂直滾動量大於水平，轉換成水平滾動
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      // 檢查是否在邊界
      const atStart = scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 1 && e.deltaY > 0;
      
      // 不在邊界時阻止預設行為
      if (!atStart && !atEnd) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    }
  }, [isDesktop]);

  // ===== 防止 Link 吃事件 =====
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasDragged || dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [wasDragged]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // 計算 aspect ratio class（如果 className 包含 h-full，則不使用 aspect ratio）
  const hasFixedHeight = className.includes('h-full');
  const aspectClass = hasFixedHeight ? '' : {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
  }[aspectRatio];

  // 0 張圖：顯示 placeholder
  if (images.length === 0) {
    return (
      <div className={`relative ${aspectClass} ${hasFixedHeight ? 'h-full' : ''} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-6xl opacity-30">📷</span>
      </div>
    );
  }

  // 1 張圖：不顯示 dots 和箭頭
  if (images.length === 1) {
    return (
      <div className={`relative ${aspectClass} ${hasFixedHeight ? 'h-full' : ''} overflow-hidden ${className}`}>
        <Image
          src={images[0]}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={priority}
          onError={(e) => {
            // Fallback: 顯示灰底
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
          }}
        />
      </div>
    );
  }

  // 2+ 張圖：可滑動 + dots + 箭頭
  return (
    <div 
      className={`relative ${hasFixedHeight ? 'h-full' : ''} ${className}`}
      onClickCapture={handleClickCapture}
    >
      {/* 滾動容器 */}
      <div
        ref={containerRef}
        className={`
          flex overflow-x-auto snap-x snap-mandatory
          scrollbar-hide select-none
          ${aspectClass}
          ${hasFixedHeight ? 'h-full' : ''}
          ${isDesktop ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}
        `}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y pan-x',
        }}
        onClick={handleContainerClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {images.map((src, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full h-full snap-start snap-always relative"
          >
            <Image
              src={src}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover pointer-events-none"
              priority={priority && index === 0}
              loading={index === 0 ? undefined : 'lazy'}
              onError={(e) => {
                // Fallback: 顯示灰底
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-200');
              }}
            />
          </div>
        ))}
      </div>

      {/* 左箭頭（桌面版） */}
      {isDesktop && currentIndex > 0 && (
        <button
          type="button"
          onClick={goToPrev}
          className="
            absolute left-2 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full
            bg-white/80 hover:bg-white
            shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all duration-200
            opacity-0 group-hover:opacity-100
            hover:scale-110
          "
          style={{ opacity: 1 }} // 始終顯示
          aria-label="上一張"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 右箭頭（桌面版） */}
      {isDesktop && currentIndex < images.length - 1 && (
        <button
          type="button"
          onClick={goToNext}
          className="
            absolute right-2 top-1/2 -translate-y-1/2 z-10
            w-10 h-10 rounded-full
            bg-white/80 hover:bg-white
            shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all duration-200
            opacity-0 group-hover:opacity-100
            hover:scale-110
          "
          style={{ opacity: 1 }}
          aria-label="下一張"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 頁面指示器 - 底部 dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none z-20">
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(index);
              }}
              className={`
                rounded-full transition-all duration-200
                pointer-events-auto
                ${index === currentIndex 
                  ? 'bg-white w-2 h-2' 
                  : 'bg-white/60 hover:bg-white/80 w-1.5 h-1.5'
                }
              `}
              aria-label={`跳到第 ${index + 1} 張圖片`}
            />
          ))}
        </div>
      </div>

      {/* 計數器 - 右上角 */}
      {showCounter && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full pointer-events-none z-20">
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
