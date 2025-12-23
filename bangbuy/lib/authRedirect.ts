'use client';

/**
 * 🔐 Auth Redirect 工具
 * 
 * 統一處理未登入用戶的導向邏輯：
 * 1. 未登入 → 導向 /login?returnTo=原目標
 * 2. 登入成功後 → 自動回到原目標
 */

import { supabase } from '@/lib/supabase';

export interface AuthCheckResult {
  isAuthenticated: boolean;
  userId?: string;
  redirectUrl?: string;
}

/**
 * 驗證 returnTo URL 是否為站內路徑（防止 Open Redirect）
 */
export function isValidReturnTo(url: string): boolean {
  if (!url) return false;
  
  // 必須以 / 開頭
  if (!url.startsWith('/')) return false;
  
  // 不允許 // 開頭（protocol-relative URL）
  if (url.startsWith('//')) return false;
  
  // 不允許包含 http:// 或 https://
  if (url.includes('http://') || url.includes('https://')) return false;
  
  // 不允許包含 javascript:
  if (url.toLowerCase().includes('javascript:')) return false;
  
  return true;
}

/**
 * 構建登入頁 URL（帶 returnTo）
 */
export function buildLoginUrl(returnTo?: string): string {
  const baseUrl = '/login';
  
  if (returnTo && isValidReturnTo(returnTo)) {
    return `${baseUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  
  return baseUrl;
}

/**
 * 獲取當前頁面的完整路徑（包含 query）
 */
export function getCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

/**
 * 檢查用戶是否已登入
 * 如果未登入，返回需要導向的登入頁 URL
 */
export async function checkAuthForChat(targetChatUrl?: string): Promise<AuthCheckResult> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // 嘗試刷新 session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        // 確定未登入，需要導向登入頁
        const returnTo = targetChatUrl || getCurrentPath();
        return {
          isAuthenticated: false,
          redirectUrl: buildLoginUrl(returnTo),
        };
      }
      
      // 重新檢查用戶
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (!refreshedUser) {
        const returnTo = targetChatUrl || getCurrentPath();
        return {
          isAuthenticated: false,
          redirectUrl: buildLoginUrl(returnTo),
        };
      }
      
      return {
        isAuthenticated: true,
        userId: refreshedUser.id,
      };
    }
    
    return {
      isAuthenticated: true,
      userId: user.id,
    };
  } catch (err) {
    console.error('[checkAuthForChat] Error:', err);
    const returnTo = targetChatUrl || getCurrentPath();
    return {
      isAuthenticated: false,
      redirectUrl: buildLoginUrl(returnTo),
    };
  }
}

/**
 * 解析 URL 中的 returnTo 參數
 */
export function getReturnToFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  
  if (returnTo && isValidReturnTo(returnTo)) {
    return returnTo;
  }
  
  return null;
}


