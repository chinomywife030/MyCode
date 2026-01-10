import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializePushNotifications } from '@/src/lib/push';
import { initializeCore } from '@/src/lib/core';
import { routeFromNotificationResponse } from '@/src/notifications/notificationRouter';
import { initializePushService } from '@/src/lib/pushService';
import { registerPushNotificationsComplete } from '@/src/lib/pushToken';
import { supabase } from '@/src/lib/supabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialized = useRef(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 只在首次載入時初始化一次
    if (!initialized.current) {
      initialized.current = true;
      
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
      
      // 初始化推播通知
      initializePushNotifications().catch((error) => {
        console.error('[RootLayout] Push notification initialization error:', error);
      });

      // 初始化推播服務（請求權限並註冊 token）
      initializePushService().catch((error) => {
        console.warn('[RootLayout] Push service initialization error:', error);
      });
    }
  }, []);

  // 推送通知 Token 註冊（取得 token 並註冊到 Server）
  useEffect(() => {
    registerPushNotificationsComplete()
      .then((token) => {
        if (token) {
          console.log('[RootLayout] Push token registered:', token.substring(0, 30) + '...');
        } else {
          console.log('[RootLayout] Failed to get Expo Push Token');
        }
      })
      .catch((error) => {
        console.error('[RootLayout] Error registering for push notifications:', error);
      });
  }, []);

  // 通知 Deep Link 處理
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromNotificationResponse(response);
    });

    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) routeFromNotificationResponse(last);
    })();

    return () => sub.remove();
  }, []);

  // Auth 狀態監聽：處理密碼重設流程
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth Event:', event, session?.user?.id); // Debug 用
      console.log('📍 Current segments:', segments); // Debug 用
      
      // 1. 如果是重設密碼事件，強制跳轉
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[RootLayout] PASSWORD_RECOVERY event detected, redirecting to reset-password');
        router.push('/auth/reset-password');
        return;
      }

      // 2. 如果是一般登入 (SIGNED_IN)
      if (event === 'SIGNED_IN' && session) {
        // 🚨 關鍵判斷：檢查當前是否已經在 "auth" 群組中
        // segments[0] 通常是群組名，segments[1] 是頁面名
        const inAuthGroup = segments[0] === 'auth';
        
        console.log('[RootLayout] SIGNED_IN event, inAuthGroup:', inAuthGroup, 'segments:', segments);
        
        // 如果使用者現在不在 Auth 流程中 (例如正在登入頁)，才跳轉去首頁
        // 如果使用者是因為 Deep Link 被帶到 reset-password 頁面的，這裡就不會執行跳轉
        if (!inAuthGroup) {
          console.log('[RootLayout] User not in auth group, navigating to home');
          router.replace('/(tabs)');
        } else {
          console.log('[RootLayout] User in auth group, skipping auto-navigation');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, segments]); // 記得把 segments 加入依賴

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="create" options={{ title: '創建許願單' }} />
        <Stack.Screen name="wish/[id]" options={{ title: 'Wish Detail' }} />
        <Stack.Screen name="trip/create" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="me/wishes" options={{ title: '我的需求', headerShown: false }} />
        <Stack.Screen name="me/trips" options={{ title: '我的行程', headerShown: false }} />
        <Stack.Screen name="me/edit-profile" options={{ title: '編輯個人資料', headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: '設定', headerShown: false }} />
        <Stack.Screen name="help" options={{ title: '幫助中心', headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ title: '重設密碼', headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
