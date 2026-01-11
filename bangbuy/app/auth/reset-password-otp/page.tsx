'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';

export default function ResetPasswordOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 從 URL 參數讀取 email 並自動發送 OTP
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam && step === 'email') {
      setEmail(emailParam);
      
      // 自動發送 OTP
      const sendOtp = async () => {
        setLoading(true);
        setErrorMsg('');

        try {
          const { error } = await supabase.auth.signInWithOtp({
            email: emailParam.trim(),
            options: {
              shouldCreateUser: false,
            },
          });

          if (error) throw error;

          setStep('otp');
          setResendCooldown(60);
        } catch (error: any) {
          console.error('[ResetPasswordOtp] Auto send OTP error:', error);
          
          if (error.message?.includes('rate limit')) {
            setErrorMsg('請稍候再試，寄送頻率過高');
            setResendCooldown(60);
          } else if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
            setErrorMsg('此 Email 尚未註冊，請先註冊帳號');
          } else {
            setErrorMsg(error.message || '發送失敗，請稍後再試');
          }
        } finally {
          setLoading(false);
        }
      };

      sendOtp();
    }
  }, [searchParams, step]);

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
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMsg('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setErrorMsg('');
      inputRefs.current[5]?.focus();
    }
  };

  // Step 1: 發送 OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrorMsg('請輸入 Email');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false, // 只允許已存在的用戶
        },
      });

      if (error) throw error;

      setStep('otp');
      setResendCooldown(60);
    } catch (error: any) {
      console.error('[ResetPasswordOtp] Send OTP error:', error);
      
      if (error.message?.includes('rate limit')) {
        setErrorMsg('請稍候再試，寄送頻率過高');
        setResendCooldown(60);
      } else if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        setErrorMsg('此 Email 尚未註冊，請先註冊帳號');
      } else {
        setErrorMsg(error.message || '發送失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 驗證 OTP 並重設密碼
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('請輸入完整的 6 位數驗證碼');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('密碼長度至少需要 8 個字元');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. 先驗證 OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      // 2. 檢查 session 是否存在
      if (!data.session) {
        throw new Error('驗證成功但無法建立登入狀態，請重新嘗試');
      }

      // 3. 更新密碼
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // 4. 登出（讓使用者用新密碼重新登入）
      await supabase.auth.signOut();

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/login?message=密碼已重設，請使用新密碼登入');
      }, 2000);
    } catch (error: any) {
      console.error('[ResetPasswordOtp] Verify and reset error:', error);
      
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        setErrorMsg('驗證碼錯誤或已過期，請重新發送');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else if (error.message?.includes('rate limit')) {
        setErrorMsg('嘗試次數過多，請稍後再試');
      } else {
        setErrorMsg(error.message || '重設失敗，請稍後再試');
      }
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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('[ResetPasswordOtp] Resend error:', error);
      
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
              密碼重設成功！✅
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              您的密碼已成功更新，即將跳轉到登入頁面...
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
          {step === 'email' ? (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                忘記密碼了嗎？
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                輸入您的 Email，我們會發送 6 位數驗證碼給您
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none"
                >
                  {loading ? '發送中...' : '發送驗證碼'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  href="/login" 
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium hover:underline"
                >
                  ← 返回登入頁面
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
                輸入驗證碼並設定新密碼
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                驗證碼已發送到
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

              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                {/* OTP 輸入框 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    驗證碼
                  </label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
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
                </div>

                {/* 新密碼 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    新密碼
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder="至少 8 個字元"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* 確認密碼 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    確認新密碼
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder="再次輸入新密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {loading ? '處理中...' : '確認重設'}
                </button>
              </form>

              {/* 重新發送 */}
              <div className="mt-4 text-center">
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

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setStep('email');
                    setOtp(['', '', '', '', '', '']);
                    setNewPassword('');
                    setConfirmPassword('');
                    setErrorMsg('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← 返回上一步
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link href="/" className="mt-8 text-gray-400 hover:text-gray-600 text-sm">
        ← 返回 BangBuy 首頁
      </Link>

      <TrustFooter className="mt-8" />
    </div>
  );
}
