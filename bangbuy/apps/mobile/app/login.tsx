import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Input } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { supabase } from '@/src/lib/supabase';
import { navigateAfterLogin } from '@/src/lib/navigation';

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('錯誤', '請輸入 Email 和密碼');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('錯誤', '請輸入姓名');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 註冊
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim() || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        // 註冊成功後，重新註冊 push token
        try {
          const { registerPushTokenToSupabase } = await import('@/src/lib/pushService');
          await registerPushTokenToSupabase();
        } catch (pushError) {
          console.warn('[LoginScreen] Failed to register push token:', pushError);
        }

        Alert.alert('成功', '註冊成功！請檢查 Email 驗證信', [
          {
            text: '確定',
            onPress: () => {
              setIsSignUp(false);
              setPassword('');
            },
          },
        ]);
      } else {
        // 登入
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        // 登入成功後，重新註冊 push token
        try {
          const { registerPushTokenToSupabase } = await import('@/src/lib/pushService');
          await registerPushTokenToSupabase();
        } catch (pushError) {
          console.warn('[LoginScreen] Failed to register push token:', pushError);
        }

        // 導航到 next 參數指定的路由
        navigateAfterLogin(next);
      }
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSignUp ? '註冊' : '登入'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Logo / Branding */}
          <View style={styles.brandingContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🛒</Text>
            </View>
            <Text style={styles.appName}>BangBuy</Text>
            <Text style={styles.tagline}>
              {isSignUp ? '建立帳號，開始代購之旅' : '歡迎回來'}
            </Text>
          </View>

          {/* Form */}
          <Card style={styles.formCard}>
            {isSignUp && (
              <Input
                label="姓名"
                placeholder="輸入姓名"
                value={name}
                onChangeText={setName}
                editable={!loading}
                autoCapitalize="words"
              />
            )}

            <Input
              label="Email"
              placeholder="輸入 Email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="密碼"
              placeholder="輸入密碼"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              title={loading ? (isSignUp ? '註冊中...' : '登入中...') : (isSignUp ? '註冊' : '登入')}
              onPress={handleAuth}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              style={styles.submitButton}
            />

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp ? '已有帳號？點此登入' : '沒有帳號？點此註冊'}
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Terms */}
          <Text style={styles.termsText}>
            繼續即表示您同意我們的服務條款和隱私政策
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 40,
  },
  appName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  switchButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.5,
  },
});
