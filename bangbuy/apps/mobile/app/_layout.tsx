import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeCore } from '@/src/lib/core';
import { supabaseService } from '@/src/lib/supabase';
import { UnreadCountProvider } from '@/components/unread/UnreadCountProvider';
import SplashAnimation from '@/components/SplashAnimation';

// ==================================================================================
// THE SAFETY NET: Global Error Boundary
// ==================================================================================
class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] Critical Error:', error, errorInfo);
  }

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.error('Restart failed', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Application Error</Text>
            <Text style={styles.errorText}>
              {this.state.error?.toString() || 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart}>
              <Text style={styles.restartButtonText}>Restart App</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// ==================================================================================
// CONFIGURATION CHECK SCREEN
// ==================================================================================
const ConfigErrorScreen = () => (
  <SafeAreaView style={styles.errorContainer}>
    <View style={styles.errorContent}>
      <Text style={styles.errorIcon}>⚙️</Text>
      <Text style={styles.errorTitle}>Configuration Missing</Text>
      <Text style={styles.errorText}>
        Critical environment variables are missing.
        Please check your Supabase configuration in `eas.json` or `.env`.
      </Text>
      <View style={styles.debugBox}>
        <Text style={styles.debugText}>EXPO_PUBLIC_SUPABASE_URL: MISSING</Text>
        <Text style={styles.debugText}>EXPO_PUBLIC_SUPABASE_ANON_KEY: MISSING</Text>
      </View>
    </View>
  </SafeAreaView>
);

// ==================================================================================
// ROOT LAYOUT
// ==================================================================================
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [isConfigValid, setIsConfigValid] = useState(true);

  useEffect(() => {
    console.log('[RootLayout] Initializing...');

    // 1. Initialize Core Services
    initializeCore();

    // 2. Validate Configuration
    const configured = supabaseService.isConfigured();
    console.log(`[RootLayout] Configuration Check: ${configured ? 'PASS' : 'FAIL'}`);
    setIsConfigValid(configured);

  }, []);

  if (!isConfigValid) {
    return <ConfigErrorScreen />;
  }

  if (!isReady) {
    return (
      <SplashAnimation onFinish={() => setIsReady(true)} />
    );
  }

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

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  restartButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginTop: 24,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
});
