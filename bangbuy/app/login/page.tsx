'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // 🔽 新增：名字狀態
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 註冊邏輯：把名字一起傳過去
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0], // 如果沒填名字，就用 Email 前綴
            },
          },
        });
        if (error) throw error;
        alert('🎉 註冊成功！');
        // 註冊成功後通常會自動登入，直接重新整理或跳轉
        router.push('/'); 
        router.refresh();
      } else {
        // 登入邏輯
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (error: any) {
      alert('錯誤：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          {isSignUp ? '註冊 BangBuy' : '登入 BangBuy'}
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {isSignUp ? '加入全球代購社群' : '歡迎回來！'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* 🔽 新增：只有註冊時才顯示「暱稱」輸入框 */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">暱稱 (顯示名稱)</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="例如：小明 (日本連線)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:bg-gray-400"
          >
            {loading ? '處理中...' : (isSignUp ? '註冊' : '登入')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:underline"
          >
            {isSignUp ? '已經有帳號？點此登入' : '還沒有帳號？免費註冊'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
           <Link href="/" className="text-gray-400 hover:text-gray-600 text-xs">
             ← 回首頁
           </Link>
        </div>
      </div>
    </div>
  );
}