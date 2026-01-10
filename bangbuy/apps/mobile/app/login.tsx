import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity, Alert, TextInput, Dimensions, Modal } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { supabase } from '@/src/lib/supabase';
import { navigateAfterLogin } from '@/src/lib/navigation';
import { Image } from 'expo-image';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

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

        // 檢查是否需要 Email 確認
        if (data.user && !data.session) {
          // 需要 Email 確認
          Alert.alert(
            '註冊成功',
            '我們已發送驗證信到您的信箱，請前往信箱收取驗證信並點擊連結完成驗證。\n\n驗證後即可登入使用。',
            [
              {
                text: '確定',
                onPress: () => {
                  setIsSignUp(false);
                  setPassword('');
                  setEmail('');
                },
              },
            ]
          );
        } else {
          // 已自動登入（如果 Supabase 設定為不需要確認）
          Alert.alert('成功', '註冊成功！', [
            {
              text: '確定',
              onPress: () => {
                setIsSignUp(false);
                setPassword('');
              },
            },
          ]);
        }
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

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('錯誤', '請輸入 Email');
      return;
    }

    // 簡單的 Email 格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail.trim())) {
      Alert.alert('錯誤', '請輸入有效的 Email 地址');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: 'bangbuy://auth/callback',
      });

      if (error) throw error;

      Alert.alert(
        '重設密碼信已發送',
        '我們已發送重設密碼連結到您的信箱，請前往信箱收取並點擊連結重設密碼。',
        [
          {
            text: '確定',
            onPress: () => {
              setForgotPasswordModalVisible(false);
              setForgotPasswordEmail('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[LoginScreen] Forgot password error:', error);
      Alert.alert('錯誤', error.message || '發送重設密碼信失敗，請稍後再試');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 上半部：橘色背景區域 (固定高度約 180px) */}
        <View style={styles.orangeSection}>
          {/* 返回按鈕 */}
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Logo 和歡迎標語 */}
          <View style={styles.brandingContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.welcomeText}>Welcome Back!</Text>
          </View>
        </View>

        {/* 下半部：白色卡片區域 (佔據剩餘所有空間) */}
        <View style={styles.whiteSection}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 表單標題 */}
            <Text style={styles.formTitle}>{isSignUp ? '建立帳號' : '登入'}</Text>

            {/* 輸入表單 */}
            <View style={styles.formContainer}>
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="姓名"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      editable={!loading}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="密碼"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {!isSignUp && (
                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => setForgotPasswordModalVisible(true)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordText}>忘記密碼？</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 登入按鈕 */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? (isSignUp ? '註冊中...' : '登入中...') : (isSignUp ? '註冊' : '登入')}
                </Text>
              </TouchableOpacity>

              {/* 登入/註冊切換連結 */}
              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.signUpLinkText}>
                  {isSignUp ? (
                    <>
                      已經有帳號？ <Text style={styles.signUpLinkHighlight}>立即登入</Text>
                    </>
                  ) : (
                    <>
                      還沒有帳號？ <Text style={styles.signUpLinkHighlight}>立即註冊</Text>
                    </>
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* 忘記密碼 Modal */}
      <Modal
        visible={forgotPasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setForgotPasswordModalVisible(false);
          setForgotPasswordEmail('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setForgotPasswordModalVisible(false);
              setForgotPasswordEmail('');
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContentWrapper}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>重設密碼</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setForgotPasswordModalVisible(false);
                      setForgotPasswordEmail('');
                    }}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  請輸入您的 Email，我們將寄送重設連結給您。
                </Text>

                <View style={styles.modalInputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      value={forgotPasswordEmail}
                      onChangeText={setForgotPasswordEmail}
                      editable={!forgotPasswordLoading}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.modalButtonGroup}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setForgotPasswordModalVisible(false);
                      setForgotPasswordEmail('');
                    }}
                    disabled={forgotPasswordLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelButtonText}>取消</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSendButton, forgotPasswordLoading && styles.modalSendButtonDisabled]}
                    onPress={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalSendButtonText}>
                      {forgotPasswordLoading ? '發送中...' : '發送'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.brandOrange,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  // 上半部：橘色背景區域 (固定高度約 180px，確保不被瀏海遮住)
  orangeSection: {
    height: 180,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.md,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: spacing.lg,
    padding: spacing.sm,
    zIndex: 10,
  },
  brandingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: spacing.xs, // 縮小間距，讓 Logo 和文字更緊湊
  },
  welcomeText: {
    fontSize: fontSize.xl, // 稍微縮小字體
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    marginTop: 0, // 移除額外的 marginTop，使用 marginBottom 控制間距
  },
  // 下半部：白色卡片區域 (佔據剩餘所有空間)
  whiteSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -1, // 確保覆蓋橘色區域
    overflow: 'hidden', // 確保圓角正確顯示
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  formTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderWidth: 0,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  loginButton: {
    width: '100%',
    height: 55,
    backgroundColor: colors.brandOrange,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    // 陰影效果
    shadowColor: colors.brandOrange,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6, // Android 陰影
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  signUpLink: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signUpLinkText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  signUpLinkHighlight: {
    color: colors.brandOrange,
    fontWeight: fontWeight.semibold,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalInputContainer: {
    marginBottom: spacing.lg,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    marginRight: spacing.sm,
  },
  modalCancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  modalSendButton: {
    flex: 1,
    height: 50,
    backgroundColor: colors.brandOrange,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.brandOrange,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSendButtonDisabled: {
    opacity: 0.6,
  },
  modalSendButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
});
