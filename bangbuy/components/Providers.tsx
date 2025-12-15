'use client';

/**
 * 🏠 全域 Providers 整合
 * 
 * 用於包裝所有 client-side providers
 * 包含：LanguageProvider, UserModeProvider, AppStatusProvider, ToastProvider, etc.
 */

import { ReactNode, Suspense, useEffect } from 'react';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import { AppStatusProvider, ReconnectingOverlay } from '@/lib/AppStatusProvider';
import { ToastProvider } from '@/components/Toast';
import RouteReloadGuard from '@/components/RouteReloadGuard';
import { useGlobalHeartbeat } from '@/hooks/useAppHeartbeat';

interface ProvidersProps {
  children: ReactNode;
}

// 內部組件：設置 heartbeat
function HeartbeatSetup() {
  useGlobalHeartbeat();
  return null;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <LanguageProvider>
      <UserModeProvider>
        <ToastProvider>
          <AppStatusProvider>
            {children}
            {/* 💓 全站功能活性檢測 */}
            <HeartbeatSetup />
            {/* 連線恢復中提示（全局） */}
            <ReconnectingOverlay />
            {/* 導航後自動重整一次的保底機制 */}
            <Suspense fallback={null}>
              <RouteReloadGuard />
            </Suspense>
          </AppStatusProvider>
        </ToastProvider>
      </UserModeProvider>
    </LanguageProvider>
  );
}

