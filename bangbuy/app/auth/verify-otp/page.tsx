'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 從 URL 或 session 取得 email
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // 嘗試從 session 取得
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      });
    }
  }, [searchParams]);

  // Resend cooldown 倒數
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // OTP 輸入處理
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // 只允許數字

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // 只取最後一個字符
    setOtp(newOtp);
    setErrorMsg('');

    // 自動跳到下一個輸入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 處理退格鍵
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 處理貼上
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setErrorMsg('');
      // 聚焦到最後一個輸入框
      inputRefs.current[5]?.focus();
    }
  };

  // 驗證 OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('請輸入完整的 6 位數驗證碼');
      return;
    }

    if (!email) {
      setErrorMsg('無法取得 Email，請重新註冊');
      router.push('/login');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup',
      });

      if (error) throw error;

      // 檢查 session 是否存在
      if (!data.session) {
        throw new Error('驗證成功但無法建立登入狀態，請重新嘗試');
      }

      setSuccess(true);
      
      // 等待一下讓使用者看到成功訊息
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (error: any) {
      console.error('[VerifyOtp] Error:', error);
      
      // 處理常見錯誤
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        setErrorMsg('驗證碼錯誤或已過期，請重新發送');
      } else if (error.message?.includes('rate limit')) {
        setErrorMsg('嘗試次數過多，請稍後再試');
      } else {
        setErrorMsg(error.message || '驗證失敗，請稍後再試');
      }
      
      // 清空 OTP
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // 重新發送 OTP
  const handleResend = async () => {
    if (resending || resendCooldown > 0 || !email) return;

    setResending(true);
    setErrorMsg('');

    try {
      // 使用 resend 方法重新發送註冊驗證 OTP
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      setResendCooldown(60); // 60 秒倒數
      setErrorMsg(''); // 清除錯誤訊息
      
      // 清空 OTP 輸入
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('[VerifyOtp] Resend error:', error);
      
      if (error.message?.includes('rate limit')) {
        setErrorMsg('請稍候再試，寄送頻率過高');
        setResendCooldown(60);
      } else {
        setErrorMsg(error.message || '發送失敗，請稍後再試');
      }
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
          BangBuy
        </Link>

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              驗證成功！🎉
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              您的帳號已成功驗證，即將跳轉...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
        BangBuy
      </Link>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            輸入驗證碼
          </h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            我們已將 6 位數驗證碼發送到
          </p>
          
          {email && (
            <div className="bg-gray-50 rounded-xl p-3 mb-6 text-center">
              <span className="font-semibold text-gray-800">{email}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* OTP 輸入框 */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
                  disabled={loading}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? '驗證中...' : '確認驗證'}
            </button>
          </form>

          {/* 重新發送 */}
          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0 || !email}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resending
                ? '發送中...'
                : resendCooldown > 0
                ? `重新發送 (${resendCooldown} 秒)`
                : '重新發送驗證碼'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-sm text-gray-600 hover:text-gray-800 font-medium hover:underline"
            >
              ← 返回登入頁面
            </Link>
          </div>
        </div>
      </div>

      <Link href="/" className="mt-8 text-gray-400 hover:text-gray-600 text-sm">
        ← 返回 BangBuy 首頁
      </Link>

      <TrustFooter className="mt-8" />
    </div>
  );
}
