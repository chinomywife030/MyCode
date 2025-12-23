'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Profile } from '@/types';
import Script from 'next/script';

// PayPal 環境設定
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-02S95485WR471912RNFEVHJY';

// PayPal 直接訂閱連結（Fallback）
const PAYPAL_DIRECT_LINK = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${PAYPAL_PLAN_ID}`;

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function SupporterCheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?returnTo=/supporter/checkout');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        
        // 如果已經是 Supporter，導向 profile 頁面
        if (profileData.is_supporter) {
          router.push('/profile');
          return;
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  const hasDisplayName = profile?.display_name && profile.display_name.trim().length > 0;

  // 渲染 PayPal 按鈕
  useEffect(() => {
    if (!paypalLoaded || !hasDisplayName || !paypalButtonRef.current || paypalRendered.current) {
      return;
    }

    if (!window.paypal) {
      setPaypalError('PayPal SDK 載入失敗');
      return;
    }

    try {
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe',
        },
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({
            plan_id: PAYPAL_PLAN_ID,
          });
        },
        onApprove: async function(data: any) {
          const subscriptionID = data.subscriptionID;
          console.log('[PayPal] Subscription approved:', subscriptionID);
          
          setProcessing(true);
          try {
            // 呼叫後端 API 驗證訂閱
            const response = await fetch('/api/supporter/paypal/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionID }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
              // 🔄 觸發資料刷新，確保 Supporter 狀態立即更新
              router.refresh();
              router.push('/supporter/success');
            } else {
              console.error('[PayPal] Approve failed:', result);
              router.push('/supporter/error');
            }
          } catch (error) {
            console.error('[PayPal] Error:', error);
            router.push('/supporter/error');
          } finally {
            setProcessing(false);
          }
        },
        onCancel: function() {
          console.log('[PayPal] Subscription cancelled by user');
        },
        onError: function(err: any) {
          console.error('[PayPal] Error:', err);
          setPaypalError('PayPal 發生錯誤，請稍後再試');
        },
      }).render(paypalButtonRef.current);
      
      paypalRendered.current = true;
    } catch (err) {
      console.error('[PayPal] Render error:', err);
      setPaypalError('PayPal 按鈕渲染失敗');
    }
  }, [paypalLoaded, hasDisplayName, router]);

  const handlePayPalLoad = () => {
    console.log('[PayPal] SDK loaded');
    setPaypalLoaded(true);
  };

  const handlePayPalError = () => {
    console.error('[PayPal] SDK load error');
    setPaypalError('PayPal SDK 載入失敗');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4">
      {/* PayPal SDK Script */}
      {hasDisplayName && PAYPAL_CLIENT_ID && (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`}
          onLoad={handlePayPalLoad}
          onError={handlePayPalError}
        />
      )}

      <div className="max-w-xl mx-auto">
        {/* 返回按鈕 */}
        <Link 
          href="/supporter" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回 Supporter 說明
        </Link>

        {/* 1️⃣ 頁面標題區 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            成為 Supporter
          </h1>
          <p className="text-gray-600">
            用每月 NT$60 支持 BangBuy 的維運與開發。
          </p>
        </div>

        {/* 2️⃣ Supporter 專屬權益區塊 */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Supporter 專屬權益</h2>
              <p className="text-sm text-gray-500">自願性支持方案</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">NT$60</p>
              <p className="text-sm text-gray-500">/ 月</p>
            </div>
          </div>
          
          <ul className="space-y-5 text-gray-700">
            {/* 權益 1：新功能優先體驗 */}
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-gray-900">新功能優先體驗（Early Access）</p>
                <p className="text-sm text-gray-500 mt-0.5">新功能將優先開放給 Supporter 使用</p>
              </div>
            </li>
            
            {/* 權益 2：專屬徽章 */}
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-gray-900">專屬 Supporter 徽章</p>
                <p className="text-sm text-gray-500 mt-0.5">在需求卡片與個人頁面顯示你的 Supporter 身分</p>
              </div>
            </li>
            
            {/* 權益 3：更乾淨的使用體驗 */}
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-gray-900">更乾淨的使用體驗</p>
                <p className="text-sm text-gray-500 mt-0.5">Supporter 使用時將不顯示推廣型廣告，介面更專注、不受干擾</p>
              </div>
            </li>
            
            {/* 權益 4：可隨時取消 */}
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm shrink-0 mt-0.5">✓</span>
              <div>
                <p className="font-medium text-gray-900">可隨時取消</p>
                <p className="text-sm text-gray-500 mt-0.5">不綁約，隨時可在 PayPal 中取消訂閱</p>
              </div>
            </li>
          </ul>
          
          {/* 補充說明 */}
          <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 leading-relaxed">
            Supporter 是支持平台營運的訂閱方案，並非購買特定功能。部分功能（如新功能體驗、廣告顯示方式）可能依平台調整。
          </p>
        </div>

        {/* 3️⃣ 定位說明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 text-sm leading-relaxed">
            <strong>重要說明：</strong>Supporter 是自願性支持方案，用於支持平台的日常維運與持續開發。這不是購買特定功能，即使不訂閱，你仍可正常使用平台核心功能。部分功能可能因第三方成本或規範限制而不包含。
          </p>
        </div>

        {/* 4️⃣ 使用者狀態確認區 */}
        {!hasDisplayName ? (
          // 情境 A：尚未設定顯示名稱
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-800 mb-1">請先設定顯示名稱</p>
                <p className="text-sm text-blue-700 mb-4">
                  設定後，Supporter 徽章才能正確顯示在你的個人頁。
                </p>
                <Link 
                  href="/profile"
                  className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  前往設定顯示名稱
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // 情境 B：已設定顯示名稱
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6">
            <p className="text-purple-800 mb-2">你的 Supporter 徽章將顯示為：</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900 text-lg">{profile?.display_name}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                ⭐ Supporter
              </span>
            </div>
          </div>
        )}

        {/* 5️⃣ 付款區 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">使用 PayPal 訂閱</h3>
          <p className="text-sm text-gray-500 mb-6">
            完成付款後，系統會自動確認你的訂閱狀態，並啟用 Supporter 身分。
          </p>

          {hasDisplayName ? (
            <>
              {/* 處理中狀態 */}
              {processing && (
                <div className="flex items-center justify-center gap-3 py-8 text-gray-600">
                  <div className="w-6 h-6 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>正在確認訂閱狀態...</span>
                </div>
              )}

              {/* PayPal 錯誤 */}
              {paypalError && !processing && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-700 text-sm mb-3">{paypalError}</p>
                  <a
                    href={PAYPAL_DIRECT_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#0070ba] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#005ea6] transition"
                  >
                    使用 PayPal 網頁訂閱
                  </a>
                </div>
              )}

              {/* PayPal 按鈕容器 */}
              {!processing && !paypalError && (
                <div ref={paypalButtonRef} className="min-h-[150px]">
                  {!paypalLoaded && (
                    <div className="flex items-center justify-center py-8 text-gray-500">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                      載入 PayPal...
                    </div>
                  )}
                </div>
              )}

              {/* Fallback 連結 */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400 mb-2">若按鈕無法顯示，可使用以下連結：</p>
                <a
                  href={PAYPAL_DIRECT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  前往 PayPal 訂閱頁面 →
                </a>
              </div>
            </>
          ) : (
            <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-500">
              請先設定顯示名稱才能訂閱
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4 text-center">
            你可以隨時在 PayPal 的「自動付款 / 訂閱」中取消 Supporter 訂閱。
          </p>
        </div>

        {/* 6️⃣ FAQ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">常見問題</h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-800 mb-1">Q：這是買功能嗎？</p>
              <p className="text-sm text-gray-600">A：不是。Supporter 是支持平台維運的方案，並不解鎖或鎖定任何功能。</p>
            </div>
            
            <div>
              <p className="font-medium text-gray-800 mb-1">Q：我可以隨時取消嗎？</p>
              <p className="text-sm text-gray-600">A：可以，你可直接在 PayPal 中取消，下個週期將不再扣款。</p>
            </div>
            
            <div>
              <p className="font-medium text-gray-800 mb-1">Q：付款後多久會顯示徽章？</p>
              <p className="text-sm text-gray-600">A：通常會在幾分鐘內啟用，視 PayPal 確認時間而定。</p>
            </div>
          </div>
        </div>

        {/* 返回首頁連結 */}
        <div className="text-center mt-8">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm transition">
            ← 返回 BangBuy 首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

