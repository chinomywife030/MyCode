'use client';

/**
 * 🏠 全域 Providers 整合
 * 
 * 用於包裝所有 client-side providers
 */

import { ReactNode, Suspense } from 'react';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import { AppStatusProvider, ReconnectingOverlay } from '@/lib/AppStatusProvider';
import { ToastProvider } from '@/components/Toast';
import RouteReloadGuard from '@/components/RouteReloadGuard';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <LanguageProvider>
      <UserModeProvider>
        <ToastProvider>
          <AppStatusProvider>
            {children}
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
