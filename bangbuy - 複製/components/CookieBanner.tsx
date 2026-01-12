/**
 * 🍪 Cookie Banner 組件
 * 
 * 首次進站顯示，符合 GDPR 要求
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'bangbuy_cookie_consent';
const CONSENT_VERSION = '2025-12-13';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 檢查是否已同意過
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        const consent = JSON.parse(stored);
        // 檢查版本是否過期（超過 12 個月）
        const consentDate = new Date(consent.timestamp);
        const now = new Date();
        const monthsDiff = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsDiff < 12 && consent.version === CONSENT_VERSION) {
          // 同意仍有效
          setShow(false);
          return;
        }
      }
      
      // 首次訪問或同意已過期，顯示 Banner
      setShow(true);
    } catch (err) {
      console.error('[CookieBanner] 檢查同意狀態失敗:', err);
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      // 記錄同意
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        accepted: true,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION,
      }));
      
      console.log('✅ [CookieBanner] 使用者已同意 Cookie 政策');
      setShow(false);
    } catch (err) {
      console.error('[CookieBanner] 記錄同意失敗:', err);
      setShow(false); // 即使記錄失敗也關閉 Banner
    }
  };

  // 避免 SSR/CSR 不一致
  if (!mounted || !show) return null;

  return (
    <>
      {/* 背景遮罩（可選） */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-white border-t-4 border-blue-600 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Cookie 圖示與文字 */}
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-2xl">🍪</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      Cookie 與隱私權通知
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      我們使用 Cookie 改善您的體驗、分析網站使用情況，並提供個人化廣告（如 Google AdSense）。
                      繼續使用即表示您同意我們的
                      <Link href="/cookies" target="_blank" className="text-blue-600 hover:underline font-semibold mx-1">
                        Cookie 政策
                      </Link>
                      與
                      <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline font-semibold mx-1">
                        隱私權政策
                      </Link>
                      。
                    </p>
                  </div>
                </div>
              </div>

              {/* 按鈕區 */}
              <div className="flex gap-3 w-full sm:w-auto sm:flex-shrink-0">
                <Link
                  href="/cookies"
                  target="_blank"
                  className="flex-1 sm:flex-none px-4 py-2.5 text-center border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition whitespace-nowrap"
                >
                  了解更多
                </Link>
                <button
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-md whitespace-nowrap"
                >
                  我同意
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 動畫樣式 */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}



























