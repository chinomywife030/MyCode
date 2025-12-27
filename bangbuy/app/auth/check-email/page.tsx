'use client';

/**
 * 📧 註冊完成 - 請驗證信箱
 * 
 * 功能：
 * 1. 提示使用者已寄出驗證信
 * 2. 重新寄送驗證信（60 秒冷卻 + localStorage 持久化）
 * 3. 前往登入
 * 4. 重新檢查驗證狀態
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';
import { AUTH_CONFIG } from '@/lib/config/auth';

// 🆕 格式化冷卻時間（mm:ss）
function formatCooldownTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs} 秒`;
}

export default function CheckEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email');
  
  const [email, setEmail] = useState<string | null>(emailFromQuery);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化：嘗試從 localStorage 取得 email（如果 query 沒有）
  useEffect(() => {
    if (!email) {
      const storedEmail = localStorage.getItem('bangbuy_signup_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [email]);

  // 🆕 初始化冷卻狀態（從 localStorage 讀取）
  useEffect(() => {
    if (!email) return;
    
    const cooldownKey = AUTH_CONFIG.getResendCooldownKey(email);
    const cooldownUntil = localStorage.getItem(cooldownKey);
    
    if (cooldownUntil) {
      const until = parseInt(cooldownUntil, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      
      if (remaining > 0) {
        setCooldownSeconds(remaining);
      } else {
        // 過期了，清除
        localStorage.removeItem(cooldownKey);
      }
    }
  }, [email]);

  // 🆕 冷卻倒數計時器（每 500ms 更新一次，更流暢）
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      return;
    }
    
    // 啟動 interval
    cooldownIntervalRef.current = setInterval(() => {
      if (!email) return;
      
      const cooldownKey = AUTH_CONFIG.getResendCooldownKey(email);
      const cooldownUntil = localStorage.getItem(cooldownKey);
      
      if (!cooldownUntil) {
        setCooldownSeconds(0);
        return;
      }
      
      const until = parseInt(cooldownUntil, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      
      if (remaining <= 0) {
        localStorage.removeItem(cooldownKey);
        setCooldownSeconds(0);
      } else {
        setCooldownSeconds(remaining);
      }
    }, 500); // 每 500ms 更新一次
    
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [cooldownSeconds, email]);

  // 🆕 重新寄送驗證信（使用 API route + localStorage 持久化）
  const handleResend = async () => {
    if (!email || resending) return;
    
    // 🆕 檢查冷卻狀態
    if (cooldownSeconds > 0) {
      setMessage({
        type: 'info',
        text: `請稍候 ${cooldownSeconds} 秒再試`,
      });
      return;
    }

    setResending(true);
    setMessage(null);

    try {
      // 🆕 呼叫 API route
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '寄送失敗');
      }

      // 🆕 成功：設定冷卻時間到 localStorage
      const cooldownKey = AUTH_CONFIG.getResendCooldownKey(email);
      const cooldownUntil = Date.now() + (AUTH_CONFIG.RESEND_COOLDOWN_SECONDS * 1000);
      localStorage.setItem(cooldownKey, cooldownUntil.toString());
      
      setMessage({
        type: 'success',
        text: '驗證信已重新寄出！請檢查您的信箱（包含垃圾郵件）',
      });
      
      // 啟動倒數
      setCooldownSeconds(AUTH_CONFIG.RESEND_COOLDOWN_SECONDS);
    } catch (error: any) {
      console.error('[CheckEmail] Resend error:', error);
      
      // 🆕 失敗：不寫入 cooldown
      setMessage({
        type: 'error',
        text: error.message || '寄送失敗，請稍後再試',
      });
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
      // 重新取得 session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setMessage({
          type: 'info',
          text: '尚未登入，請先完成驗證後再登入',
        });
        return;
      }

      // 重新取得使用者資訊
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setMessage({
          type: 'info',
          text: '尚未登入，請先完成驗證後再登入',
        });
        return;
      }

      if (user.email_confirmed_at) {
        setMessage({
          type: 'success',
          text: '🎉 Email 已驗證成功！即將跳轉...',
        });
        
        // 清除 localStorage
        localStorage.removeItem('bangbuy_signup_email');
        
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
      console.error('[CheckEmail] Check status error:', error);
      setMessage({
        type: 'error',
        text: '檢查失敗，請稍後再試',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
        BangBuy
      </Link>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
          {/* 圖示 */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">✉️</span>
            </div>
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            註冊成功，請驗證信箱
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            我們已寄送驗證信到你的 Email，<br />
            請至信箱點擊「確認連結」完成註冊。
          </p>

          {/* Email 顯示 */}
          {email && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-center border border-blue-100">
              <span className="text-xs text-gray-500 uppercase font-bold">驗證信已寄送至</span>
              <p className="font-semibold text-gray-800 mt-1 break-all">{email}</p>
            </div>
          )}

          {/* 提示 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
            <p className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">💡</span>
              <span>
                若找不到請查看<strong>垃圾郵件匣</strong>，或稍等 1–3 分鐘。
                驗證信可能需要一些時間送達。
              </span>
            </p>
          </div>

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

          {/* 按鈕區 */}
          <div className="space-y-3">
            {/* 按鈕 C：重新檢查 */}
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

            {/* 按鈕 A：重新寄送 */}
            <button
              onClick={handleResend}
              disabled={resending || cooldownSeconds > 0 || !email}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  寄送中...
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <span>⏱️</span>
                  可於 {formatCooldownTime(cooldownSeconds)} 後重新寄送
                </>
              ) : (
                <>
                  <span>📨</span>
                  重新寄送驗證信
                </>
              )}
            </button>
            
            {/* 🆕 冷卻說明 */}
            {cooldownSeconds > 0 && (
              <div className="relative w-full">
                {/* 進度條 */}
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500 ease-linear"
                    style={{ 
                      width: `${((AUTH_CONFIG.RESEND_COOLDOWN_SECONDS - cooldownSeconds) / AUTH_CONFIG.RESEND_COOLDOWN_SECONDS) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* 頻率限制說明 */}
            <p className="text-xs text-gray-400 text-center -mt-2">
              為避免濫用，驗證信寄送有頻率限制
            </p>

            {/* 按鈕 B：前往登入 */}
            <Link
              href="/login"
              className="w-full block text-center bg-gray-100 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition active:scale-[0.98]"
            >
              前往登入
            </Link>
          </div>
        </div>
      </div>

      {/* 幫助提示 */}
      <div className="mt-6 text-center text-sm text-gray-500 max-w-md">
        <p>
          如需協助，請聯繫{' '}
          <a href="mailto:bangbuy.contact@gmail.com" className="text-blue-600 hover:underline">
            bangbuy.contact@gmail.com
          </a>
        </p>
      </div>

      {/* Trust Footer */}
      <TrustFooter className="mt-8" />
    </div>
  );
}
