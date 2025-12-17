'use client';

/**
 * 🏠 全域 Providers 整合
 * 
 * 用於包裝所有 client-side providers
 * 
 * 🆕 新增：
 * - AuthProvider：統一使用者狀態管理
 * - EmailVerificationGuard：全站 Email 驗證守衛
 */

import { ReactNode, Suspense } from 'react';
import { LanguageProvider } from '@/components/LanguageProvider';
import { UserModeProvider } from '@/components/UserModeProvider';
import { AppStatusProvider, ReconnectingOverlay } from '@/lib/AppStatusProvider';
import { AuthProvider } from '@/lib/AuthProvider';
import { EmailVerificationGuard } from '@/components/EmailVerificationGuard';
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
          <AuthProvider>
            <AppStatusProvider>
              <EmailVerificationGuard>
                {children}
              </EmailVerificationGuard>
              {/* 連線恢復中提示（全局） */}
              <ReconnectingOverlay />
              {/* 導航後自動重整一次的保底機制 */}
              <Suspense fallback={null}>
                <RouteReloadGuard />
              </Suspense>
            </AppStatusProvider>
          </AuthProvider>
        </ToastProvider>
      </UserModeProvider>
    </LanguageProvider>
  );
}
