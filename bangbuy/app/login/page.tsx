'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LegalConsentBlock from '@/components/LegalConsentBlock';
import TrustFooter from '@/components/TrustFooter';
import { isValidReturnTo } from '@/lib/authRedirect';
import { getAuthCallbackUrl } from '@/lib/siteUrl';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'login' | 'signup'>('login');
  
  // 🔐 從 URL 獲取 returnTo 參數
  const returnTo = searchParams.get('returnTo');
  const validReturnTo = returnTo && isValidReturnTo(returnTo) ? returnTo : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setErrorMsg('');

    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
            },
            // 🔐 使用統一的 site URL，確保驗證信連結正確
            emailRedirectTo: getAuthCallbackUrl(),
          },
        });
        
        if (error) throw error;
        
        // 🔐 記錄條款同意資訊（寫入 profile）
        // 注意：開啟 Confirm Email 後，signUp 可能回傳 session=null 但 user 有值
        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              name: name || email.split('@')[0],
              terms_accepted_at: new Date().toISOString(),
              terms_version: '2025-12-13',
            }, { onConflict: 'id' });
            
            // 同時記錄到 localStorage（備份）
            localStorage.setItem('bangbuy_terms_accepted', JSON.stringify({
              timestamp: new Date().toISOString(),
              version: '2025-12-13',
              userId: data.user.id,
            }));
          } catch (profileError) {
            console.error('[註冊] 記錄條款同意失敗:', profileError);
            // 不中斷註冊流程
          }
        }
        
        // 🆕 儲存 email 到 localStorage（供 check-email 頁使用）
        localStorage.setItem('bangbuy_signup_email', email);
        
        // ✅ 註冊成功後導向 check-email 頁面（帶上 email 參數）
        // 無論 session 是否為 null，只要沒 error 就視為註冊成功
        router.replace(`/auth/check-email?email=${encodeURIComponent(email)}`);
        return; // 不需要 refresh
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // 🆕 登入後檢查 email 是否已驗證
        if (data.user && !data.user.email_confirmed_at) {
          router.push('/verify-email');
        } else {
          // 🔐 登入成功後導向 returnTo 或首頁
          const targetUrl = validReturnTo || '/';
          console.log('[Login] 登入成功，導向:', targetUrl);
          router.push(targetUrl);
        }
        router.refresh();
      }
    } catch (error: any) {
      setErrorMsg(error.message === 'Invalid login credentials' ? '帳號或密碼錯誤' : error.message);
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
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => {
              setView('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-4 text-sm font-bold transition-colors 
              ${view === 'login' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            登入
          </button>
          <button
            onClick={() => {
              setView('signup');
              setErrorMsg('');
            }}
            className={`flex-1 py-4 text-sm font-bold transition-colors 
              ${view === 'signup' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            註冊帳號
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {view === 'login' ? '歡迎回來 👋' : '加入 BangBuy 社群 🚀'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {view === 'login' ? '請輸入您的帳號密碼以繼續。' : '填寫資料即可開始你的代購之旅。'}
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {view === 'signup' && (
              <div className="animate-fade-in-down">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">暱稱</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-gray-900 placeholder:text-gray-700"
                  placeholder="例：小林 (日本留學生)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-gray-900 placeholder:text-gray-700"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">密碼</label>
              <input
                type="password"
                required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-gray-900 placeholder:text-gray-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 🔐 法務條款告知（純文字，不阻斷流程） */}
            <div className="pt-2">
              <LegalConsentBlock
                mode={view === 'signup' ? 'register' : 'login'}
                checked={false}
                onChange={() => {}}
                showError={false}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? '處理中...' : view === 'login' ? '立即登入' : '免費註冊'}
            </button>
          </form>
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
