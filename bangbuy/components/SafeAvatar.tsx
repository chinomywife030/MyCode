'use client';

/**
 * 🖼️ SafeAvatar - 安全的頭像組件
 * 
 * 特點：
 * 1. 圖片加載失敗時自動 fallback 到預設頭像
 * 2. 支援 Supabase Storage 和 ui-avatars.com
 * 3. 不使用 Next.js Image 優化（避免 400 錯誤）
 */

import { useState } from 'react';

interface SafeAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
  className?: string;
}

// 生成預設頭像 URL
function getDefaultAvatarUrl(name: string | null | undefined): string {
  const initial = (name || '?')[0].toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=3b82f6&color=fff&size=128`;
}

// 檢查 URL 是否有效
function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function SafeAvatar({ src, name, size = 40, className = '' }: SafeAvatarProps) {
  const [error, setError] = useState(false);
  
  // 決定要顯示的 URL
  const displayUrl = (!error && isValidUrl(src)) ? src! : getDefaultAvatarUrl(name);
  
  return (
    <img
      src={displayUrl}
      alt={name || '用戶'}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// 也導出 helper 函數
export { getDefaultAvatarUrl, isValidUrl };




/**
 * 🖼️ SafeAvatar - 安全的頭像組件
 * 
 * 特點：
 * 1. 圖片加載失敗時自動 fallback 到預設頭像
 * 2. 支援 Supabase Storage 和 ui-avatars.com
 * 3. 不使用 Next.js Image 優化（避免 400 錯誤）
 */

import { useState } from 'react';

interface SafeAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
  className?: string;
}

// 生成預設頭像 URL
function getDefaultAvatarUrl(name: string | null | undefined): string {
  const initial = (name || '?')[0].toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=3b82f6&color=fff&size=128`;
}

// 檢查 URL 是否有效
function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function SafeAvatar({ src, name, size = 40, className = '' }: SafeAvatarProps) {
  const [error, setError] = useState(false);
  
  // 決定要顯示的 URL
  const displayUrl = (!error && isValidUrl(src)) ? src! : getDefaultAvatarUrl(name);
  
  return (
    <img
      src={displayUrl}
      alt={name || '用戶'}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}

// 也導出 helper 函數
export { getDefaultAvatarUrl, isValidUrl };



