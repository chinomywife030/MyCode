'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LegalConsentBlock from '@/components/LegalConsentBlock';
import TrustFooter from '@/components/TrustFooter';

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setErrorMsg(error.message);
  };

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
            // 指定驗證信的 redirect URL
            emailRedirectTo: `${location.origin}/auth/callback`,
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
          router.push('/');
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
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">密碼</label>
                {view === 'login' && (
                  <Link 
                    href="/forgot-password" 
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    忘記密碼？
                  </Link>
                )}
              </div>
              <input
                type="password"
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 🔐 法務條款告知（純文字，不阻斷流程） */}
            <div className="pt-2">
              <LegalConsentBlock
                mode={view}
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">快速登入</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              使用 Google 繼續
            </button>
          </div>
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
