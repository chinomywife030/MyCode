'use client';

/**
 * 💀 Skeleton Loading 組件
 * 
 * 用於顯示載入狀態的骨架屏
 */

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

// 基礎 Skeleton
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-skeleton rounded ${className}`} />
  );
}

// 文字 Skeleton
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

// 頭像 Skeleton
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
}

// 卡片 Skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <div className="flex gap-3">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

// 列表 Skeleton
export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// 訊息 Skeleton
export function SkeletonMessage({ isOwnMessage = false }: { isOwnMessage?: boolean }) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : ''}`}>
        <Skeleton className={`h-12 w-48 rounded-2xl ${isOwnMessage ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} />
      </div>
    </div>
  );
}

// 對話列表 Skeleton
export function SkeletonConversationList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <SkeletonAvatar size="lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

// 通知列表 Skeleton
export function SkeletonNotificationList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4">
          <SkeletonAvatar />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-48 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}














