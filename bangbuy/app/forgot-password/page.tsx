'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TrustFooter from '@/components/TrustFooter';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrorMsg('請輸入 Email');
      return;
    }

    // 直接導向 OTP 重設密碼頁面
    router.push(`/auth/reset-password-otp?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 text-3xl font-black text-blue-600 tracking-tighter">
        BangBuy
      </Link>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="p-8">
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-[0.98]"
            >
              下一步
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

