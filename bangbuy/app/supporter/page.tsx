'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hasAccess } from '@/lib/featureAccess';

export default function SupporterPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSupporter, setIsSupporter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasEarlyAccess, setHasEarlyAccess] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_supporter')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.is_supporter) {
          setIsSupporter(true);
          
          // 檢查 Early Access 權限
          const access = await hasAccess(
            { isLoggedIn: true, isSupporter: true, userId: user.id },
            'early_access_demo'
          );
          setHasEarlyAccess(access);
        }
      }
      setLoading(false);
    }
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 返回首頁 */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回首頁
        </Link>

        {/* Hero 區塊 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-lg mb-6">
            ⭐ Supporter
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            支持 BangBuy
          </h1>
          <p className="text-xl text-gray-600 max-w-xl mx-auto">
            用每月 NT$60 支持平台的維運與開發，讓 BangBuy 持續為你服務。
          </p>
        </div>

        {/* 已是 Supporter 的提示 */}
        {!loading && isSupporter && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-2xl p-6 mb-8 text-center">
            <p className="text-purple-800 font-medium mb-3">
              🎉 你已經是 Supporter！感謝你的支持。
            </p>
            <Link 
              href="/profile"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition"
            >
              查看個人頁
            </Link>
          </div>
        )}

        {/* 🔥 Early Access Demo（只有 Supporter 可見） */}
        {!loading && hasEarlyAccess && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                🚀 Early Access
              </span>
              <span className="text-sm text-white/80">Supporter 專屬</span>
            </div>
            <h3 className="text-xl font-bold mb-2">搶先體驗新功能</h3>
            <p className="text-white/90 text-sm leading-relaxed">
              感謝你成為 Supporter！你可以在這裡優先體驗平台的新功能與測試版內容。
              此區塊僅對 Supporter 顯示。
            </p>
          </div>
        )}

        {/* 方案說明 */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Supporter 方案</h2>
                <p className="text-purple-100">月繳訂閱</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">NT$60</p>
                <p className="text-purple-100">/ 月</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">方案內容</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800">支持平台維運與開發</p>
                  <p className="text-sm text-gray-500">你的支持是平台持續運作的動力</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800">Supporter 專屬徽章</p>
                  <p className="text-sm text-gray-500">在個人頁顯示 Supporter 身分</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800">優先體驗新功能（Early Access）</p>
                  <p className="text-sm text-gray-500">新功能推出時 Supporter 可第一時間體驗</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-gray-800">隨時取消</p>
                  <p className="text-sm text-gray-500">可隨時在 PayPal 中取消訂閱，沒有任何限制</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 定位說明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <h3 className="font-bold text-amber-800 mb-2">重要說明</h3>
          <p className="text-amber-700 leading-relaxed">
            Supporter 是<strong>自願性支持方案</strong>，用於支持平台的日常維運與持續開發。這不是購買特定功能，即使不訂閱，你仍可正常使用平台所有核心功能。部分功能可能因第三方成本或規範限制而不包含。
          </p>
        </div>

        {/* CTA 按鈕 */}
        {!loading && !isSupporter && (
          <div className="text-center">
            <Link 
              href={isLoggedIn ? "/supporter/checkout" : "/login?returnTo=/supporter/checkout"}
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              {isLoggedIn ? '立即訂閱' : '登入並訂閱'}
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              使用 PayPal 安全付款
            </p>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">常見問題</h2>
          
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="font-medium text-gray-800 mb-2">Q：Supporter 是買功能嗎？</p>
              <p className="text-gray-600">A：不是。Supporter 是支持平台維運的方案，並不解鎖或鎖定任何功能。所有用戶都能使用平台的核心功能。</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="font-medium text-gray-800 mb-2">Q：我可以隨時取消嗎？</p>
              <p className="text-gray-600">A：可以，你可直接在 PayPal 的「自動付款」中取消訂閱，下個週期將不再扣款。</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="font-medium text-gray-800 mb-2">Q：付款後多久會顯示徽章？</p>
              <p className="text-gray-600">A：通常會在幾分鐘內啟用，視 PayPal 確認時間而定。</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="font-medium text-gray-800 mb-2">Q：取消後徽章會消失嗎？</p>
              <p className="text-gray-600">A：是的，當訂閱到期後，Supporter 徽章會自動移除。但你隨時可以重新訂閱。</p>
            </div>
          </div>
        </div>

        {/* 返回首頁 */}
        <div className="text-center mt-12">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition">
            ← 返回 BangBuy 首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

