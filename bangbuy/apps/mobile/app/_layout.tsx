import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
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

  // Push Token 註冊：只在用戶登入後且未註冊過時執行一次
  useEffect(() => {
    if (didRegisterPushTokenRef.current) return;
    
    const checkAndRegister = async () => {
      try {
        // Session Guard：先檢查 session，避免 AuthSessionMissingError
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // 不記錄 AuthSessionMissingError（這是正常情況）
          if (!sessionError.message?.includes('Auth session missing') && 
              !sessionError.message?.includes('AuthSessionMissingError')) {
            console.error('[RootLayout] Session error:', sessionError);
          }
          console.log('[RootLayout] Push token registration skipped: no session');
          return;
        }
        
        if (!session) {
          console.log('[RootLayout] Push token registration skipped: user not logged in');
          return;
        }

        // 檢查是否已註冊過（通過檢查 didRegisterPushTokenRef）
        if (didRegisterPushTokenRef.current) {
          console.log('[RootLayout] Push token registration skipped: already registered');
          return;
        }

        didRegisterPushTokenRef.current = true;
        console.log('[RootLayout] Registering push token for logged-in user');
        
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

    return () => sub.remove();
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

      // 2. 如果是一般登入 (SIGNED_IN)
      if (event === 'SIGNED_IN' && session) {
        // 檢查當前是否已經在 "auth" 群組中
        const inAuthGroup = currentSegments[0] === 'auth';
        
        console.log('[RootLayout] SIGNED_IN event, inAuthGroup:', inAuthGroup, 'segments:', currentSegments);
        
        // 如果使用者現在不在 Auth 流程中，才跳轉去首頁
        if (!inAuthGroup) {
          console.log('[RootLayout] User not in auth group, navigating to home');
          currentRouter.replace('/(tabs)');
        } else {
          console.log('[RootLayout] User in auth group, skipping auto-navigation');
        }

        // 登入後嘗試註冊 push token（如果尚未註冊）
        if (!didRegisterPushTokenRef.current) {
          console.log('[RootLayout] User signed in, attempting to register push token');
          registerPushTokenToSupabase()
            .then((result) => {
              if (result.success) {
                didRegisterPushTokenRef.current = true;
                console.log('[RootLayout] Push token registered after sign-in');
              } else {
                console.log('[RootLayout] Push token registration skipped after sign-in:', result.error);
              }
            })
            .catch((error) => {
              console.error('[RootLayout] Error registering push token after sign-in:', error);
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
    return <SplashAnimation onFinish={() => setReady(true)} />;
  }

  // 動畫完成後，渲染原本的 App 結構
  return (
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
  );
}
