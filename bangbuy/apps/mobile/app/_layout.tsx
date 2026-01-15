import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializePushNotifications } from '@/src/lib/push';
import { initializeCore } from '@/src/lib/core';
import { routeFromNotificationResponse } from '@/src/notifications/notificationRouter';
import { registerPushTokenToSupabase } from '@/src/lib/pushService';
import { supabase } from '@/src/lib/supabase';
import { checkIfFirstLaunch } from '@/src/lib/onboarding';
import SplashAnimation from '@/components/SplashAnimation';
import { UnreadCountProvider } from '@/components/unread/UnreadCountProvider';

// Build tag for TestFlight build identification
const BUILD_TAG = "tf-regen-2026-01-14-01";

// ============ 全域錯誤邊界（防止 release crash 變白屏）============
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  /**
   * 從 error.stack 中提取第一個包含專案路徑的 frame
   */
  private extractFirstProjectFrame(stack: string | undefined): string {
    if (!stack) return '(not found)';
    
    const lines = stack.split('\n');
    for (const line of lines) {
      if (line.includes('/app/') || line.includes('/src/') || line.includes('apps/mobile')) {
        return line.trim();
      }
    }
    return '(not found)';
  }

  /**
   * 提取 stack 前 20 行
   */
  private extractStackFirst20(stack: string | undefined): string {
    if (!stack) return '(無堆疊資訊)';
    const lines = stack.split('\n');
    return lines.slice(0, 20).join('\n');
  }

  /**
   * 提取診斷資訊
   */
  private extractDiagnostics(error: Error | null) {
    if (!error) {
      return {
        name: '(unknown)',
        message: '(unknown)',
        firstProjectFrame: '(not found)',
        stackFirst20: '(無堆疊資訊)',
      };
    }

    return {
      name: error.name || '(unknown)',
      message: error.message || '(unknown)',
      firstProjectFrame: this.extractFirstProjectFrame(error.stack),
      stackFirst20: this.extractStackFirst20(error.stack),
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 提取診斷資訊
    const diagnostics = this.extractDiagnostics(error);
    
    // 在 release 中這會被捕獲而不是閃退
    console.error('[GlobalErrorBoundary] Caught error:', error);
    console.error('[GlobalErrorBoundary] Error info:', errorInfo);
    
    // 輸出結構化診斷資訊（確保在 release 也能看到）
    console.error('[GlobalErrorBoundary] Diagnostics:', JSON.stringify(diagnostics, null, 2));
  }

  handleCopyError = async () => {
    const error = this.state.error;
    if (!error) return;

    const diagnostics = this.extractDiagnostics(error);
    
    const errorText = [
      `錯誤名稱: ${diagnostics.name}`,
      `錯誤訊息: ${diagnostics.message}`,
      '',
      '第一個專案 Frame:',
      diagnostics.firstProjectFrame,
      '',
      '堆疊前 20 行:',
      diagnostics.stackFirst20,
    ].join('\n');

    try {
      await Clipboard.setStringAsync(errorText);
      Alert.alert('已複製', '錯誤資訊已複製到剪貼簿');
    } catch (copyError) {
      console.error('[GlobalErrorBoundary] Failed to copy error:', copyError);
      Alert.alert('複製失敗', '無法複製錯誤資訊');
    }
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const diagnostics = this.extractDiagnostics(error);
      const errorStack = error?.stack || '(無堆疊資訊)';
      
      // 限制堆疊顯示為前 40 行
      const stackLines = errorStack.split('\n');
      const limitedStack = stackLines.slice(0, 40).join('\n');
      const hasMoreLines = stackLines.length > 40;

      return (
        <View style={errorStyles.container}>
          <ScrollView 
            style={errorStyles.scrollView}
            contentContainerStyle={errorStyles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={errorStyles.title}>發生錯誤</Text>
            
            {/* 診斷資訊區塊 */}
            <View style={errorStyles.section}>
              <Text style={errorStyles.sectionTitle}>診斷資訊:</Text>
              <View style={errorStyles.diagnosticBox}>
                <Text style={errorStyles.diagnosticLabel}>錯誤名稱:</Text>
                <Text style={errorStyles.diagnosticValue}>{diagnostics.name}</Text>
                
                <Text style={errorStyles.diagnosticLabel}>錯誤訊息:</Text>
                <Text style={errorStyles.diagnosticValue}>{diagnostics.message}</Text>
                
                <Text style={errorStyles.diagnosticLabel}>第一個專案 Frame:</Text>
                <Text style={errorStyles.diagnosticValue}>{diagnostics.firstProjectFrame}</Text>
                
                <Text style={errorStyles.diagnosticLabel}>堆疊前 20 行:</Text>
                <Text style={errorStyles.stackSmall}>{diagnostics.stackFirst20}</Text>
              </View>
            </View>

            {/* 完整堆疊（最多 40 行） */}
            <View style={errorStyles.section}>
              <Text style={errorStyles.sectionTitle}>完整錯誤堆疊:</Text>
              <Text style={errorStyles.stack}>
                {limitedStack}
                {hasMoreLines && '\n...(已省略更多行)'}
              </Text>
            </View>

            <TouchableOpacity
              style={errorStyles.copyButton}
              onPress={this.handleCopyError}
              activeOpacity={0.7}
            >
              <Text style={errorStyles.copyButtonText}>複製錯誤</Text>
            </TouchableOpacity>

            <Text style={errorStyles.hint}>請重新啟動 App</Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  diagnosticBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  diagnosticLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginTop: 8,
    marginBottom: 4,
  },
  diagnosticValue: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  stackSmall: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  stack: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
    lineHeight: 18,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
// ============ 全域錯誤邊界結束 ============

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  
  // 一次性初始化鎖
  const didInitRef = useRef(false);
  const didCheckOnboardingRef = useRef(false);
  const didSetupAuthListenerRef = useRef(false);
  const didRegisterPushTokenRef = useRef(false);
  
  // 使用 ref 存儲 router 和 segments，避免在 useEffect 中依賴它們
  const routerRef = useRef(router);
  const segmentsRef = useRef(segments);
  
  // 更新 refs（不觸發重新執行）
  routerRef.current = router;
  segmentsRef.current = segments;
  
  // Splash Gate：控制是否顯示啟動動畫
  const [ready, setReady] = useState(false);
  
  // Onboarding 狀態：獨立管理，不依賴 router
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState<boolean | null>(null);
  
  // 暫存待處理的通知 response（在 navigation ready 前收到）
  const [pendingNotificationResponse, setPendingNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);

  // 一次性初始化：只在組件首次 mount 時執行
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    
    console.log("[BangBuy] BUILD_TAG:", BUILD_TAG);
    console.log('[RootLayout] 🔄 Starting one-time initialization');
    
    // 初始化 core layer
    initializeCore();
    
    // 清除 App 角標（Badge）
    Notifications.setBadgeCountAsync(0)
      .then(() => {
        console.log('[RootLayout] ✅ App badge cleared');
      })
      .catch((error) => {
        console.warn('[RootLayout] Failed to clear badge:', error);
      });
    
    // 初始化推播通知（只設置 handler，不註冊 token）
    initializePushNotifications().catch((error) => {
      console.error('[RootLayout] Push notification initialization error:', error);
    });

    // 檢查是否為首次啟動（只計算狀態，不直接導航）
    if (!didCheckOnboardingRef.current) {
      didCheckOnboardingRef.current = true;
      checkIfFirstLaunch()
        .then((isFirstLaunch) => {
          if (isFirstLaunch) {
            console.log('[RootLayout] First launch detected, will show onboarding');
          } else {
            console.log('[RootLayout] Not first launch, skipping onboarding');
          }
          setShouldShowOnboarding(isFirstLaunch);
        })
        .catch((error) => {
          console.error('[RootLayout] Error checking first launch:', error);
          // 發生錯誤時，預設顯示 Onboarding
          setShouldShowOnboarding(true);
        });
    }
  }, []); // 空依賴：只執行一次

  // Onboarding 路由：根據狀態導航，不形成循環
  useEffect(() => {
    if (shouldShowOnboarding === null || !ready) return;
    
    if (shouldShowOnboarding) {
      // 使用 ref 獲取最新的 segments，避免依賴變化
      const currentSegments = segmentsRef.current;
      const currentRouter = routerRef.current;
      
      // 只在當前不在 onboarding 頁面時才導航
      if (currentSegments[0] !== 'onboarding') {
        console.log('[RootLayout] Navigating to onboarding');
        currentRouter.replace('/onboarding');
      }
    }
  }, [shouldShowOnboarding, ready]); // 只依賴狀態，不依賴 router/segments

  // Push Token 註冊：等待 session 恢復後才註冊（啟動時）
  useEffect(() => {
    if (didRegisterPushTokenRef.current) return;
    
    const checkAndRegister = async () => {
      try {
        // 必須先等待 session 恢復完成
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // 不記錄 AuthSessionMissingError（這是正常情況）
          if (!sessionError.message?.includes('Auth session missing') && 
              !sessionError.message?.includes('AuthSessionMissingError')) {
            console.error('[RootLayout] Session error:', sessionError);
          }
          console.log('[RootLayout] Push token registration skipped: session error');
          return;
        }
        
        // 必須有 session 且 session.user 存在才註冊
        if (!session || !session.user) {
          console.log('[RootLayout] Push token registration skipped: no session or user');
          return;
        }

        // 檢查是否已註冊過（通過檢查 didRegisterPushTokenRef）
        if (didRegisterPushTokenRef.current) {
          console.log('[RootLayout] Push token registration skipped: already registered');
          return;
        }

        didRegisterPushTokenRef.current = true;
        console.log('[RootLayout] Session restored, registering push token');
        
        const result = await registerPushTokenToSupabase();
        if (result.success) {
          console.log('[RootLayout] Push token registered successfully');
        } else {
          console.log('[RootLayout] Push token registration skipped:', result.error);
          // 如果註冊失敗，重置標記以便下次重試
          didRegisterPushTokenRef.current = false;
        }
      } catch (error: any) {
        // Session Guard：捕獲 AuthSessionMissingError，不 throw
        if (error?.message?.includes('Auth session missing') || 
            error?.name === 'AuthSessionMissingError' ||
            error?.message?.includes('AuthSessionMissingError')) {
          console.log('[RootLayout] Push token registration skipped: session missing');
          didRegisterPushTokenRef.current = false;
          return;
        }
        console.error('[RootLayout] Error checking/registering push token:', error);
        didRegisterPushTokenRef.current = false;
      }
    };

    // 延遲執行，確保 auth 狀態已初始化
    const timer = setTimeout(checkAndRegister, 500);
    return () => clearTimeout(timer);
  }, []); // 空依賴：只執行一次

  // 通知 Deep Link 處理（確保 navigation ready 後才執行）
  useEffect(() => {
    // 檢查 navigation 是否 ready
    const isNavigationReady = navigationState?.key != null;
    
    // 如果有待處理的 response 且 navigation 已 ready，執行導航
    if (pendingNotificationResponse && isNavigationReady) {
      console.log('[RootLayout] Navigation ready, processing pending notification response');
      routeFromNotificationResponse(pendingNotificationResponse);
      setPendingNotificationResponse(null);
    }
  }, [navigationState?.key, pendingNotificationResponse]);

  // 註冊通知 response listener
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      // 檢查 navigation 是否 ready
      const isNavigationReady = navigationState?.key != null;
      
      if (isNavigationReady) {
        // Navigation 已 ready，直接執行導航
        console.log('[RootLayout] Navigation ready, processing notification response immediately');
        routeFromNotificationResponse(response);
      } else {
        // Navigation 尚未 ready，暫存 response
        console.log('[RootLayout] Navigation not ready yet, storing notification response for later');
        setPendingNotificationResponse(response);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // 處理冷啟動時的初始通知
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          const isNavigationReady = navigationState?.key != null;
          if (isNavigationReady) {
            console.log('[RootLayout] Navigation ready, processing last notification response');
            routeFromNotificationResponse(last);
          } else {
            console.log('[RootLayout] Navigation not ready yet, storing last notification response');
            setPendingNotificationResponse(last);
          }
        }
      } catch (error) {
        // iOS 上可能不支援 getLastNotificationResponseAsync，靜默處理
        console.warn('[RootLayout] Failed to get last notification response:', error);
      }
    })();

    return () => sub?.remove?.();
  }, [navigationState?.key]);

  // Auth 狀態監聽：只設置一次，使用 ref 訪問 router 和 segments
  useEffect(() => {
    if (didSetupAuthListenerRef.current) return;
    didSetupAuthListenerRef.current = true;
    
    console.log('[RootLayout] Setting up auth state listener (one-time)');
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 使用 ref 獲取最新的 router 和 segments，避免依賴變化
      const currentRouter = routerRef.current;
      const currentSegments = segmentsRef.current;
      
      // 只在非 INITIAL_SESSION 事件時記錄（避免重複 log）
      if (event !== 'INITIAL_SESSION') {
        console.log('🔔 Auth Event:', event, session?.user?.id);
      }
      
      // 1. 如果是重設密碼事件，強制跳轉
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[RootLayout] PASSWORD_RECOVERY event detected, redirecting to reset-password');
        currentRouter.push('/auth/reset-password');
        return;
      }

      // 2. 處理 SIGNED_IN 和 TOKEN_REFRESHED 事件（session 已恢復）
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
        // 檢查當前是否已經在 "auth" 群組中（僅 SIGNED_IN 時處理導航）
        if (event === 'SIGNED_IN') {
          const inAuthGroup = currentSegments[0] === 'auth';
          
          console.log('[RootLayout] SIGNED_IN event, inAuthGroup:', inAuthGroup, 'segments:', currentSegments);
          
          // 如果使用者現在不在 Auth 流程中，才跳轉去首頁
          if (!inAuthGroup) {
            console.log('[RootLayout] User not in auth group, navigating to home');
            currentRouter.replace('/(tabs)');
          } else {
            console.log('[RootLayout] User in auth group, skipping auto-navigation');
          }
        }

        // Session 已恢復（SIGNED_IN 或 TOKEN_REFRESHED），嘗試註冊 push token
        if (!didRegisterPushTokenRef.current) {
          console.log(`[RootLayout] ${event} event, session restored, attempting to register push token`);
          registerPushTokenToSupabase()
            .then((result) => {
              if (result.success) {
                didRegisterPushTokenRef.current = true;
                console.log(`[RootLayout] Push token registered after ${event}`);
              } else {
                console.log(`[RootLayout] Push token registration skipped after ${event}:`, result.error);
              }
            })
            .catch((error) => {
              console.error(`[RootLayout] Error registering push token after ${event}:`, error);
            });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // 空依賴：只設置一次

  // Splash Gate：如果動畫尚未完成，顯示啟動動畫
  if (!ready) {
    console.log('[RootLayout] Not ready, showing SplashAnimation');
    return <SplashAnimation onFinish={() => setReady(true)} />;
  }

  // 動畫完成後，渲染原本的 App 結構
  // 使用 GlobalErrorBoundary 包裹，防止 release crash
  return (
    <GlobalErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <UnreadCountProvider>
          <Stack>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="create" options={{ title: '創建許願單' }} />
            <Stack.Screen name="wish/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="trip/create" options={{ headerShown: false }} />
            <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="me/wishes" options={{ title: '我的需求', headerShown: false }} />
            <Stack.Screen name="me/trips" options={{ title: '我的行程', headerShown: false }} />
            <Stack.Screen name="me/edit-profile" options={{ title: '編輯個人資料', headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: '設定', headerShown: false }} />
            <Stack.Screen name="help" options={{ title: '聯絡我們', headerShown: false }} />
            <Stack.Screen name="help/shipping" options={{ title: '運回台灣方式', headerShown: false }} />
            <Stack.Screen name="help/shipping/risks" options={{ title: '風險與法規', headerShown: false }} />
            <Stack.Screen name="auth/reset-password" options={{ title: '重設密碼', headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </UnreadCountProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}
