import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
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

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialized = useRef(false);

  useEffect(() => {
    // 只在首次載入時初始化一次
    if (!initialized.current) {
      initialized.current = true;
      
      // 初始化 core layer
      initializeCore();
      
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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: '登入', presentation: 'modal' }} />
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
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
