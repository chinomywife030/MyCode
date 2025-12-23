'use client';

/**
 * 📧 Email 驗證頁面
 * 
 * 功能：
 * 1. 提示使用者已寄出驗證信
 * 2. 顯示目前登入 email
 * 3. 重新寄送驗證信
 * 4. 重新檢查驗證狀態
 * 5. 登出
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 初始化：取得使用者資訊
  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // 沒有 session，導向登入頁
          router.replace('/login');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace('/login');
          return;
        }

        // 已驗證 -> 導向首頁
        if (user.email_confirmed_at) {
          router.replace('/');
          return;
        }

        setEmail(user.email || null);
      } catch (error) {
        console.error('[VerifyEmail] Error:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, [router]);

  // 重新寄送驗證信
  const handleResend = async () => {
    if (!email || resending) return;

    setResending(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: '驗證信已重新寄出！請檢查您的信箱（包含垃圾郵件）',
      });
    } catch (error: any) {
      console.error('[VerifyEmail] Resend error:', error);
      
      // 處理常見錯誤
      if (error.message?.includes('rate limit')) {
        setMessage({
          type: 'error',
          text: '請稍候再試，寄送頻率過高',
        });
      } else {
        setMessage({
          type: 'error',
          text: error.message || '寄送失敗，請稍後再試',
        });
      }
    } finally {
      setResending(false);
    }
  };

  // 重新檢查驗證狀態
  const handleCheckStatus = async () => {
    if (checking) return;

    setChecking(true);
    setMessage(null);

    try {
      // 強制刷新 session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.replace('/login');
        return;
      }

      // 重新取得使用者資訊
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      if (user.email_confirmed_at) {
        setMessage({
          type: 'success',
          text: '🎉 Email 已驗證成功！即將跳轉...',
        });
        
        // 稍微延遲讓使用者看到成功訊息
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } else {
        setMessage({
          type: 'info',
          text: '尚未完成驗證，請點擊信箱中的驗證連結',
        });
      }
    } catch (error: any) {
      console.error('[VerifyEmail] Check status error:', error);
      setMessage({
        type: 'error',
        text: '檢查失敗，請稍後再試',
      });
    } finally {
      setChecking(false);
    }
  };

  // 登出
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('[VerifyEmail] Sign out error:', error);
      // 即使登出失敗也導向登入頁
      router.replace('/login');
    }
  };

  // Loading 狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
        BangBuy
      </Link>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
          {/* 圖示 */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">📧</span>
            </div>
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            驗證您的 Email
          </h1>
          
          <p className="text-gray-500 text-center mb-6">
            我們已發送一封驗證信到您的信箱
          </p>

          {/* Email 顯示 */}
          {email && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
              <span className="text-sm text-gray-500">登入帳號</span>
              <p className="font-semibold text-gray-800 mt-1">{email}</p>
            </div>
          )}

          {/* 訊息提示 */}
          {message && (
            <div
              className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            >
              <span className="text-lg">
                {message.type === 'success' ? '✓' : message.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* 說明步驟 */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>檢查您的收件匣（和垃圾郵件資料夾）</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>點擊信中的「驗證 Email」按鈕</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>回到這裡點擊「重新檢查」</span>
            </div>
          </div>

          {/* 按鈕區 */}
          <div className="space-y-3">
            {/* 重新檢查 */}
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  檢查中...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  我已完成驗證，重新檢查
                </>
              )}
            </button>

            {/* 重新寄送 */}
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  寄送中...
                </>
              ) : (
                <>
                  <span>📨</span>
                  重新寄送驗證信
                </>
              )}
            </button>

            {/* 登出 */}
            <button
              onClick={handleSignOut}
              className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm font-medium transition"
            >
              使用其他帳號登入
            </button>
          </div>
        </div>
      </div>

      {/* 幫助提示 */}
      <div className="mt-6 text-center text-sm text-gray-500 max-w-md">
        <p>沒收到驗證信？請檢查垃圾郵件資料夾，或確認 Email 地址是否正確。</p>
        <p className="mt-2">
          如需協助，請聯繫{' '}
          <a href="mailto:support@bangbuy.app" className="text-blue-600 hover:underline">
            support@bangbuy.app
          </a>
        </p>
      </div>

      {/* Trust Footer */}
      <TrustFooter className="mt-8" />
    </div>
  );
}










