'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
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
          {!success ? (
            <>
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                忘記密碼了嗎？
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                沒關係！輸入您的 Email，我們會發送重設密碼的連結給您。
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleResetRequest} className="space-y-4">
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
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none"
                >
                  {loading ? '發送中...' : '發送重設連結'}
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
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">
                郵件已發送！✉️
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                我們已將重設密碼的連結發送到 <span className="font-semibold text-gray-800">{email}</span>
              </p>
              <p className="text-xs text-gray-500 mb-6">
                請檢查您的收件匣（也可能在垃圾郵件中），並點擊連結來重設密碼。
              </p>

              <Link 
                href="/login" 
                className="inline-block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
              >
                返回登入頁面
              </Link>
            </div>
          )}
        </div>
      </div>

      <Link href="/" className="mt-8 text-gray-400 hover:text-gray-600 text-sm">
        ← 返回 BangBuy 首頁
      </Link>
    </div>
  );
}

