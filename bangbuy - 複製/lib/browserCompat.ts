/**
 * 🌐 瀏覽器兼容性工具
 * 
 * 提供跨瀏覽器 API fallback 和性能檢測
 */

// ============================================
// requestIdleCallback fallback
// ============================================

export const requestIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as any).requestIdleCallback
    : (callback: () => void) => setTimeout(callback, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? (window as any).cancelIdleCallback
    : clearTimeout;

// ============================================
// 裝置/瀏覽器檢測
// ============================================

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

// ============================================
// 低性能模式檢測
// ============================================

let _isLowPerformance: boolean | null = null;

export function isLowPerformanceDevice(): boolean {
  if (_isLowPerformance !== null) return _isLowPerformance;
  
  if (typeof navigator === 'undefined') {
    _isLowPerformance = false;
    return false;
  }

  // 檢測硬體並發數（CPU 核心數）
  const cores = navigator.hardwareConcurrency || 4;
  
  // 檢測記憶體（如果可用）
  const memory = (navigator as any).deviceMemory || 4;
  
  // iOS Safari 或低核心/低記憶體裝置
  _isLowPerformance = (isIOS() && isSafari()) || cores <= 2 || memory <= 2;
  
  return _isLowPerformance;
}

// ============================================
// CSS 支援檢測
// ============================================

export function supportsBackdropFilter(): boolean {
  if (typeof CSS === 'undefined') return false;
  return CSS.supports('backdrop-filter', 'blur(1px)') || 
         CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
}

// ============================================
// 安全的 localStorage 操作
// ============================================

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 性能計時工具
// ============================================

export function measureTime(label: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }
  
  return duration;
}

export async function measureAsyncTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

