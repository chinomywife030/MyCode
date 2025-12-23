'use client';

/**
 * Supporter 橫向 Banner 組件
 * 位置：首頁內容區（非浮動、非彈窗）
 * 策略：明顯但不煩、不遮內容、可關閉
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'supporter_banner_dismissed_until';
const DISMISS_DURATION_NON_SUPPORTER = 7 * 24 * 60 * 60 * 1000; // 7 天
const DISMISS_DURATION_SUPPORTER = 14 * 24 * 60 * 60 * 1000; // 14 天

export default function SupporterPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSupporter, setIsSupporter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSupporterStatus() {
      try {
        // 1. 檢查 localStorage 是否已關閉
        const dismissedUntil = localStorage.getItem(STORAGE_KEY);
        if (dismissedUntil) {
          const dismissedTimestamp = parseInt(dismissedUntil, 10);
          if (Date.now() < dismissedTimestamp) {
            // 還在關閉期間，不顯示
            setIsLoading(false);
            return;
          } else {
            // 已過期，清除記錄
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // 2. 檢查用戶登入狀態和 Supporter 狀態
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // 未登入：顯示推廣版本
          setIsSupporter(false);
          setIsVisible(true);
          setIsLoading(false);
          return;
        }

        // 3. 讀取 profiles.is_supporter（single source of truth）
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_supporter, display_name')
          .eq('id', user.id)
          .maybeSingle();

        const userIsSupporter = profileData?.is_supporter === true;
        setIsSupporter(userIsSupporter);
        setIsVisible(true);
      } catch (error) {
        console.error('[SupporterPrompt] Error:', error);
        // 錯誤時不顯示，避免干擾
        setIsVisible(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSupporterStatus();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // 記錄關閉時間
    const dismissDuration = isSupporter 
      ? DISMISS_DURATION_SUPPORTER 
      : DISMISS_DURATION_NON_SUPPORTER;
    
    const dismissedUntil = Date.now() + dismissDuration;
    localStorage.setItem(STORAGE_KEY, dismissedUntil.toString());
  };

  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // 符合 full reload 規則
    window.location.assign('/supporter/checkout');
  };

  // 載入中或不可見時不渲染
  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-purple-50 via-white to-pink-50 border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {isSupporter ? (
            /* Supporter 感謝版本 */
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-lg shrink-0">⭐</span>
              <div className="min-w-0">
                <span className="font-bold text-purple-800 text-sm md:text-base">
                  你已是 Supporter
                </span>
                <span className="hidden sm:inline text-gray-600 text-sm ml-2">
                  你目前享有新功能優先體驗權，並使用無廣告的 Supporter 介面
                </span>
                <p className="sm:hidden text-gray-600 text-xs mt-0.5 truncate">
                  享有新功能優先體驗權與無廣告介面
                </p>
              </div>
            </div>
          ) : (
            /* 非 Supporter 推廣版本 */
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-lg shrink-0">⭐</span>
              <div className="min-w-0">
                <span className="font-bold text-purple-800 text-sm md:text-base">
                  Supporter 可優先體驗新功能
                </span>
                <span className="hidden md:inline text-gray-600 text-sm ml-2">
                  成為 Supporter，即可第一時間使用新功能、顯示專屬徽章，並享有更乾淨的使用體驗｜每月 NT$60，可隨時取消
                </span>
                <p className="md:hidden text-gray-600 text-xs mt-0.5 truncate">
                  新功能優先體驗、專屬徽章、更乾淨的介面｜NT$60/月
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {!isSupporter && (
              <a
                href="/supporter/checkout"
                onClick={handleCTAClick}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs md:text-sm font-bold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm whitespace-nowrap"
              >
                成為 Supporter
              </a>
            )}
            
            {/* 關閉按鈕 */}
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              aria-label="關閉"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
