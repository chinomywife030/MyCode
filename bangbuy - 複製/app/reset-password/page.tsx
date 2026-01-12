'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';

// 是否為開發模式（用於 logs）
const isDev = process.env.NODE_ENV === 'development';

function log(...args: any[]) {
  // Production 也輸出（便於 debug），但可以改成 isDev only
  console.log('[Reset Password]', ...args);
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'expired' | 'invalid' | 'generic' | null>(null);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [resendEmail, setResendEmail] = useState('');
  
  // 防止重複消耗 code/token（React strict mode guard）
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const processRecoveryLink = async () => {
      // 如果已經處理過，不再重複執行（React strict mode guard）
      if (hasProcessedRef.current) {
        log('Already processed, skipping...');
        return;
      }
      hasProcessedRef.current = true;

      try {
        // ============================================
        // 1. 獲取當前 URL 資訊（用於 debug）
        // ============================================
        const fullUrl = window.location.href;
        const hash = window.location.hash;
        const search = window.location.search;
        
        log('========== Processing Recovery Link ==========');
        log('Full URL:', fullUrl);
        log('Hash:', hash || '(empty)');
        log('Search:', search || '(empty)');
        
        // ============================================
        // 2. 檢查是否有錯誤參數（真的過期）
        // ============================================
        // URL 可能包含 ?error=access_denied&error_code=403&error_description=...
        // 或者 hash 中可能有 #error=...
        const urlParams = new URLSearchParams(search);
        const hashParams = new URLSearchParams(hash.substring(1));
        
        const urlError = urlParams.get('error');
        const urlErrorCode = urlParams.get('error_code');
        const urlErrorDesc = urlParams.get('error_description');
        
        const hashError = hashParams.get('error');
        const hashErrorCode = hashParams.get('error_code');
        const hashErrorDesc = hashParams.get('error_description');
        
        const error = urlError || hashError;
        const errorCode = urlErrorCode || hashErrorCode;
        const errorDesc = urlErrorDesc || hashErrorDesc;
        
        if (error) {
          log('❌ Error detected:', { error, errorCode, errorDesc });
          
          if (error === 'access_denied' && (errorCode === '403' || errorDesc?.includes('expired') || errorDesc?.includes('invalid'))) {
            setErrorType('expired');
            setErrorMsg('此重設連結已過期或已被使用，請重新申請。');
          } else {
            setErrorType('invalid');
            setErrorMsg(errorDesc || '連結無效，請重新申請重設密碼。');
          }
          setValidToken(false);
          setIsProcessing(false);
          return;
        }
        
        // ============================================
        // 3. 檢查並處理 URL Query 中的 code（PKCE 格式）
        // ============================================
        const code = urlParams.get('code');
        
        if (code) {
          log('📧 Found code in query, exchanging for session...');
          log('Code (masked):', code.substring(0, 10) + '...');
          
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              log('❌ exchangeCodeForSession failed:', exchangeError.message);
              
              if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid')) {
                setErrorType('expired');
                setErrorMsg('此重設連結已過期或已被使用，請重新申請。');
              } else {
                setErrorType('generic');
                setErrorMsg(exchangeError.message || '驗證失敗，請重新申請重設密碼。');
              }
              setValidToken(false);
              setIsProcessing(false);
              return;
            }
            
            log('✅ exchangeCodeForSession success');
            log('Session user:', data.session?.user?.email);
            
            // 清除 URL query（避免重新整理時再次消耗）
            window.history.replaceState({}, '', '/reset-password');
            
            setValidToken(true);
            setIsProcessing(false);
            return;
            
          } catch (err: any) {
            log('❌ exchangeCodeForSession exception:', err.message);
            setErrorType('generic');
            setErrorMsg('處理重設連結時發生錯誤，請重新申請。');
            setValidToken(false);
            setIsProcessing(false);
            return;
          }
        }
        
        // ============================================
        // 4. 檢查並處理 URL Hash 中的 access_token（implicit 格式）
        // ============================================
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (accessToken && refreshToken) {
          log('🔑 Found tokens in hash, setting session...');
          log('Type:', type);
          log('Access token (masked):', accessToken.substring(0, 20) + '...');
          
          try {
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              log('❌ setSession failed:', setSessionError.message);
              
              if (setSessionError.message.includes('expired') || setSessionError.message.includes('invalid')) {
                setErrorType('expired');
                setErrorMsg('此重設連結已過期或已被使用，請重新申請。');
              } else {
                setErrorType('generic');
                setErrorMsg(setSessionError.message || '驗證失敗，請重新申請重設密碼。');
              }
              setValidToken(false);
              setIsProcessing(false);
              return;
            }
            
            log('✅ setSession success');
            log('Session user:', data.session?.user?.email);
            
            // 清除 URL hash（避免重新整理時再次消耗）
            window.history.replaceState({}, '', '/reset-password');
            
            setValidToken(true);
            setIsProcessing(false);
            return;
            
          } catch (err: any) {
            log('❌ setSession exception:', err.message);
            setErrorType('generic');
            setErrorMsg('處理重設連結時發生錯誤，請重新申請。');
            setValidToken(false);
            setIsProcessing(false);
            return;
          }
        }
        
        // ============================================
        // 5. 沒有 code 也沒有 hash token，檢查現有 session
        // ============================================
        log('ℹ️  No code or hash tokens found, checking existing session...');
        
        // 給 Supabase 一點時間處理可能的 auto-detection
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          log('❌ getSession error:', sessionError.message);
          setErrorType('invalid');
          setErrorMsg('無法驗證，請重新申請重設密碼。');
          setValidToken(false);
          setIsProcessing(false);
          return;
        }
        
        if (session) {
          log('✅ Found existing session');
          log('Session user:', session.user?.email);
          setValidToken(true);
          setIsProcessing(false);
          return;
        }
        
        // 真的沒有任何 session
        log('⚠️  No session found');
        setErrorType('invalid');
        setErrorMsg('請從 Email 中的重設連結進入此頁面。');
        setValidToken(false);
        setIsProcessing(false);
        
      } catch (error: any) {
        log('❌ Unexpected error:', error.message);
        setErrorType('generic');
        setErrorMsg('處理重設連結時發生錯誤，請重新申請。');
        setValidToken(false);
        setIsProcessing(false);
      }
    };

    processRecoveryLink();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 驗證密碼
    if (password.length < 6) {
      setErrorMsg('密碼至少需要 6 個字元');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      log('✅ Password updated successfully');
      setSuccess(true);
      
      // ✅ 完成後立即導向 /login
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      log('❌ updateUser error:', error.message);
      setErrorMsg(error.message || '重設失敗，請稍後再試');
      setLoading(false);
    }
  };

  const handleResendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      setErrorMsg('請輸入 Email');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 直接導向 /reset-password，不使用 /auth/callback
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: 'https://bangbuy.app/reset-password',
      });

      if (error) throw error;

      setErrorMsg('');
      alert('重設密碼連結已重新發送，請檢查您的信箱。');
      setResendEmail('');
    } catch (error: any) {
      setErrorMsg(error.message || '發送失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
        BangBuy
      </Link>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
          {isProcessing ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">正在驗證重設連結...</p>
            </div>
          ) : !validToken ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              
              {/* 根據錯誤類型顯示不同訊息 */}
              {errorType === 'expired' ? (
                <>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">連結已過期或已使用</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    此重設連結只能使用一次，或已超過有效期限。
                    <br />請重新申請重設密碼。
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">連結無效</h3>
                  <p className="text-sm text-gray-600 mb-6">{errorMsg || '請從 Email 中的連結進入此頁面。'}</p>
                </>
              )}
              
              {/* 重新發送選項 */}
              <div className="space-y-4">
                <form onSubmit={handleResendResetEmail} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                      placeholder="name@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {loading ? '發送中...' : '重新發送重設連結'}
                  </button>
                </form>
                
                <div className="text-sm text-gray-500">或</div>
                
                <Link 
                  href="/forgot-password" 
                  className="inline-block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-center"
                >
                  前往忘記密碼頁面
                </Link>
              </div>
            </div>
          ) : !success ? (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                設定新密碼
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                請輸入您的新密碼（至少 6 個字元）
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    新密碼
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    確認新密碼
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none"
                >
                  {loading ? '更新中...' : '更新密碼'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">
                密碼重設成功！🎉
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                您的密碼已成功更新，正在跳轉到登入頁面...
              </p>
            </div>
          )}
        </div>
      </div>

      <Link href="/" className="mt-8 text-gray-400 hover:text-gray-600 text-sm">
        ← 返回 BangBuy 首頁
      </Link>

      {/* 🔒 Trust Footer */}
      <TrustFooter className="mt-8" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
          BangBuy
        </Link>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-8">
          <div className="text-center py-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
