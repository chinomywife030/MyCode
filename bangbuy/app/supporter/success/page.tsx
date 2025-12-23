'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SupporterSuccessPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, is_supporter')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData?.display_name) {
          setDisplayName(profileData.display_name);
        }
      }
      setLoading(false);
      
      // 🔄 觸發資料刷新，確保卡片顯示最新的 Supporter 狀態
      router.refresh();
    }
    fetchProfile();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 成功動畫 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* 標題 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          付款成功，感謝你成為 Supporter 🎉
        </h1>

        {/* 說明 */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          我們已收到你的訂閱資訊，Supporter 徽章已啟用。感謝你支持 BangBuy！
        </p>

        {/* 徽章預覽 */}
        {!loading && displayName && (
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 mb-8">
            <p className="text-sm text-gray-500 mb-3">你的 Supporter 徽章：</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-bold text-gray-900 text-xl">{displayName}</span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-md">
                ⭐ Supporter
              </span>
            </div>
          </div>
        )}

        {/* 按鈕 */}
        <div className="space-y-3">
          <Link 
            href="/profile"
            className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
          >
            前往個人頁查看徽章
          </Link>
          
          <Link 
            href="/dashboard"
            className="block w-full bg-white text-gray-700 py-4 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition"
          >
            返回 Dashboard
          </Link>
        </div>

        {/* 感謝訊息 */}
        <p className="text-sm text-gray-500 mt-8">
          感謝你支持 BangBuy 的持續發展 ❤️
        </p>
      </div>
    </div>
  );
}

