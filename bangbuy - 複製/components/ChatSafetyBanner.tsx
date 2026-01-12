/**
 * 🛡️ 聊天安全提示橫幅 - 半透明浮層樣式
 * 
 * 設計規範：
 * - 半透明琥珀色背景（opacity 75%）
 * - backdrop-filter: blur(8px)
 * - 圓角 12px
 * - 單層陰影
 * - 靜態橫幅（非浮動）
 */

'use client';

import { useOnboarding, ONBOARDING_KEYS } from '@/hooks/useOnboarding';

export default function ChatSafetyBanner() {
  const { shouldShow, hide } = useOnboarding(ONBOARDING_KEYS.CHAT_SAFETY);

  if (!shouldShow) return null;

  return (
    <div 
      className="border-b"
      style={{
        backgroundColor: 'rgba(251, 191, 36, 0.15)',  // 琥珀色 15% 透明度（更淡）
        borderColor: 'rgba(251, 191, 36, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div 
          className="flex items-start gap-3 px-4 py-2.5 border"
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.75)',  // 琥珀色 75% 透明度
            borderRadius: '12px',
            borderColor: 'rgba(252, 211, 77, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white leading-relaxed font-medium">
              為保障雙方權益，請勿私下交易，所有紀錄皆保留於平台
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={hide}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="關閉提示"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

