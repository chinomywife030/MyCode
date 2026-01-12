'use client';

/**
 * 📧 Email 驗證守衛
 * 
 * 功能：
 * 1. 檢查使用者是否已登入且 email 已驗證
 * 2. 未登入 -> 導向 /login
 * 3. 已登入但未驗證 -> 導向 /verify-email
 * 4. 白名單頁面不做導轉（避免無限 redirect）
 */

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

// 不需要驗證的白名單路徑
const AUTH_WHITELIST = [
  '/login',
  '/verify-email',
  // '/auth/check-email',  // 🆕 註冊後驗證頁（已刪除）
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/terms',
  '/privacy',
  '/disclaimer',
  '/copyright',
  '/cookies',
];

// 公開頁面（不需要登入）
const PUBLIC_ROUTES = [
  '/',
  '/terms',
  '/privacy',
  '/disclaimer',
  '/copyright',
  '/cookies',
  '/calculator',
];

/**
 * 檢查路徑是否在白名單中
 */
function isWhitelisted(pathname: string): boolean {
  return AUTH_WHITELIST.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * 檢查是否為公開路由（不需要登入）
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  );
}

export function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, loading, emailVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // 等待初始化完成
    if (!initialized || loading) return;

    // 白名單頁面不做導轉
    if (isWhitelisted(pathname)) {
      hasRedirected.current = false;
      return;
    }

    // 公開頁面不需要登入
    if (isPublicRoute(pathname)) {
      hasRedirected.current = false;
      return;
    }

    // 未登入 -> 導向登入頁
    if (!user) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        router.replace('/login');
      }
      return;
    }

    // 已登入但 email 未驗證 -> 暫時不導向驗證頁（允許繼續使用）
    // if (user && !emailVerified) {
    //   if (!hasRedirected.current) {
    //     hasRedirected.current = true;
    //     router.replace('/verify-email');
    //   }
    //   return;
    // }

    // 正常狀態，重置 redirect 標記
    hasRedirected.current = false;
  }, [user, initialized, loading, emailVerified, pathname, router]);

  // 白名單頁面直接渲染
  if (isWhitelisted(pathname)) {
    return <>{children}</>;
  }

  // 公開頁面直接渲染
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // 載入中或未初始化：顯示 loading
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入：顯示 loading（等待 redirect）
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">正在跳轉至登入頁...</p>
        </div>
      </div>
    );
  }

  // 已登入但未驗證：暫時允許繼續使用（不阻擋）
  // if (!emailVerified) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
  //         <p className="text-gray-500 text-sm">請先驗證您的 Email...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // 正常渲染
  return <>{children}</>;
}

export default EmailVerificationGuard;

