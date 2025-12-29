import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializePushNotifications } from '@/src/lib/push';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pushInitialized = useRef(false);

  useEffect(() => {
    // 只在首次載入時初始化一次
    if (!pushInitialized.current) {
      pushInitialized.current = true;
      initializePushNotifications().catch((error) => {
        console.error('[RootLayout] Push notification initialization error:', error);
      });
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="wish/[id]" options={{ title: 'Wish Detail' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
