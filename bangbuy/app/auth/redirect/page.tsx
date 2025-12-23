'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isValidReturnTo } from '@/lib/authRedirect';

/**
 * 🔐 Auth Redirect 處理
 * 
 * 處理 OAuth 登入後的 returnTo 導向
 * 因為 server-side route 無法讀取 localStorage，
 * 所以使用這個 client-side 頁面來處理
 */
export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 從 localStorage 讀取 returnTo
    const returnTo = localStorage.getItem('bangbuy_auth_returnTo');
    
    // 清除 localStorage
    localStorage.removeItem('bangbuy_auth_returnTo');
    
    // 驗證並導向
    if (returnTo && isValidReturnTo(returnTo)) {
      console.log('[Auth Redirect] 導向:', returnTo);
      router.replace(returnTo);
    } else {
      console.log('[Auth Redirect] 無 returnTo，導向首頁');
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">登入成功，正在導向...</p>
      </div>
    </div>
  );
}




