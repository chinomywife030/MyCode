/**
 * 🌐 Site URL 配置
 * 
 * 統一管理網站 URL，確保所有 Email 連結、Auth redirect 等都使用正確的 domain。
 * 
 * Production: https://bangbuy.app
 * Preview: Vercel preview URL
 * Development: http://localhost:3000
 */

// Production domain - 固定不變
const PRODUCTION_DOMAIN = 'https://bangbuy.app';

/**
 * 取得網站 URL
 * 
 * 優先級：
 * 1. 環境變數 NEXT_PUBLIC_SITE_URL（如有設定）
 * 2. Production 環境固定使用 https://bangbuy.app
 * 3. Preview 環境使用 Vercel URL
 * 4. Development 環境使用 localhost
 */
export function getSiteUrl(): string {
  // 1. 優先使用明確設定的環境變數
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''); // 移除尾部斜線
  }
  
  // 2. Production 環境固定使用正式 domain
  if (process.env.NODE_ENV === 'production') {
    // 檢查是否為 Vercel preview deployment
    if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // Production deployment 固定使用正式 domain
    return PRODUCTION_DOMAIN;
  }
  
  // 3. Development 環境
  return 'http://localhost:3000';
}

/**
 * 取得 Auth Callback URL
 * 用於 Supabase Auth 的 redirectTo / emailRedirectTo
 */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/**
 * 取得重設密碼 URL
 */
export function getResetPasswordUrl(): string {
  return `${getSiteUrl()}/reset-password`;
}

/**
 * 驗證 URL 是否為有效的站內 URL
 * 防止 Open Redirect 攻擊
 */
export function isValidSiteUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    const siteUrl = new URL(getSiteUrl());
    
    // 必須是同一個 host
    return parsed.host === siteUrl.host;
  } catch {
    return false;
  }
}

/**
 * 建構絕對 URL
 * 使用 new URL() 確保正確的 URL 格式
 */
export function buildUrl(path: string): string {
  // 確保 path 以 / 開頭
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, getSiteUrl()).toString();
}

// 🚨 Production 環境驗證
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  const siteUrl = getSiteUrl();
  
  // 如果不是 preview，必須是 bangbuy.app
  if (process.env.VERCEL_ENV !== 'preview') {
    if (!siteUrl.includes('bangbuy.app')) {
      console.error(`🚨 [siteUrl] Production URL 不正確: ${siteUrl}`);
      console.error(`🚨 [siteUrl] 應該是: ${PRODUCTION_DOMAIN}`);
    }
  }
}

// 導出常數供其他模組使用
export const SITE_URL = getSiteUrl();
export { PRODUCTION_DOMAIN };





