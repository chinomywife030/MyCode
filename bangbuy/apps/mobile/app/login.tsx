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
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 註冊流程狀態
  const [signupStep, setSignupStep] = useState<'form' | 'verify'>('form');
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);

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

        // 註冊成功後，切換到驗證碼輸入步驟
        if (data.user) {
          setSignupStep('verify');
          Alert.alert('驗證碼已發送', '我們已發送 6 位數驗證碼到您的信箱，請輸入驗證碼完成註冊。');
        } else {
          throw new Error('註冊失敗，請重新嘗試');
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

  // Step 1: 發送 OTP 驗證碼
  const handleSendOtp = async () => {
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
      // 使用 signInWithOtp 發送驗證碼
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotPasswordEmail.trim(),
        options: {
          shouldCreateUser: false, // 確保只允許舊用戶
        },
      });

      if (error) throw error;

      // 成功發送，進入 Step 2
      setForgotPasswordStep('otp');
      Alert.alert('驗證碼已發送', '我們已發送 6 位數驗證碼到您的信箱，請輸入驗證碼。');
    } catch (error: any) {
      console.error('[LoginScreen] Send OTP error:', error);
      Alert.alert('錯誤', error.message || '發送驗證碼失敗，請稍後再試');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Step 2: 驗證 OTP 並重設密碼
  const handleVerifyAndReset = async () => {
    // 驗證輸入
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      Alert.alert('錯誤', '請輸入 6 位數驗證碼');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('錯誤', '請輸入新密碼');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('錯誤', '密碼長度至少需要 6 個字元');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('錯誤', '兩次輸入的密碼不一致');
      return;
    }

    setOtpLoading(true);

    try {
      // 1. 驗證 OTP
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotPasswordEmail.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (verifyError) {
        console.error('[LoginScreen] Verify OTP error:', verifyError);
        Alert.alert('驗證失敗', verifyError.message || '驗證碼錯誤或已過期，請重新申請');
        setOtpCode('');
        return;
      }

      // 2. 關鍵修正：確認 Session 是否存在
      if (!data.session) {
        console.error('[LoginScreen] Session missing after verifyOtp');
        Alert.alert('錯誤', '驗證成功但無法建立登入狀態，請重新嘗試。');
        setOtpCode('');
        return;
      }

      // 3. 只有現在才能更新密碼
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (updateError) {
        console.error('[LoginScreen] Update password error:', updateError);
        Alert.alert('密碼更新失敗', updateError.message || '更新密碼時發生錯誤，請稍後再試');
        return;
      }

      // 成功後登出（清除 recovery session）
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('[LoginScreen] Sign out error (non-critical):', signOutError);
      }

      // 顯示成功訊息
      Alert.alert(
        '成功',
        '密碼已重設！請使用新密碼重新登入。',
        [
          {
            text: '確定',
            onPress: () => {
              // 重置所有狀態
              setForgotPasswordModalVisible(false);
              setForgotPasswordStep('email');
              setForgotPasswordEmail('');
              setOtpCode('');
              setNewPassword('');
              setConfirmPassword('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[LoginScreen] Unexpected error:', error);
      Alert.alert('錯誤', error.message || '發生未知錯誤，請重新嘗試');
      setOtpCode('');
    } finally {
      setOtpLoading(false);
    }
  };

  // 驗證註冊 OTP
  const handleVerifySignup = async () => {
    if (!signupOtpCode.trim() || signupOtpCode.trim().length !== 6) {
      Alert.alert('錯誤', '請輸入 6 位數驗證碼');
      return;
    }

    setSignupOtpLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: signupOtpCode.trim(),
        type: 'signup',
      });

      if (verifyError) {
        console.error('[LoginScreen] Verify signup OTP error:', verifyError);
        Alert.alert('驗證失敗', verifyError.message || '驗證碼錯誤或已過期，請重新申請');
        setSignupOtpCode('');
        return;
      }

      // 確認 Session 是否存在
      if (!data.session) {
        console.error('[LoginScreen] Session missing after verifySignup');
        Alert.alert('錯誤', '驗證成功但無法建立登入狀態，請重新嘗試。');
        setSignupOtpCode('');
        return;
      }

      // 註冊成功後，重新註冊 push token
      try {
        const { registerPushTokenToSupabase } = await import('@/src/lib/pushService');
        await registerPushTokenToSupabase();
      } catch (pushError) {
        console.warn('[LoginScreen] Failed to register push token:', pushError);
      }

      // 顯示成功訊息並導航
      Alert.alert(
        '註冊成功',
        '歡迎加入 BangBuy！',
        [
          {
            text: '確定',
            onPress: () => {
              // 重置狀態
              setSignupStep('form');
              setSignupOtpCode('');
              setIsSignUp(false);
              setPassword('');
              setEmail('');
              setName('');
              // 導航到首頁
              navigateAfterLogin(next);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[LoginScreen] Verify signup error:', error);
      Alert.alert('錯誤', error.message || '驗證失敗，請重新嘗試');
      setSignupOtpCode('');
    } finally {
      setSignupOtpLoading(false);
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
            <Text style={styles.formTitle}>
              {isSignUp && signupStep === 'verify' ? '驗證信箱' : isSignUp ? '建立帳號' : '登入'}
            </Text>

            {/* 註冊驗證碼步驟 */}
            {isSignUp && signupStep === 'verify' ? (
              <View style={styles.formContainer}>
                <Text style={styles.verifyDescription}>
                  我們已發送 6 位數驗證碼到 {email}，請輸入驗證碼完成註冊。
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="keypad-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="請輸入 6 位數驗證碼"
                      placeholderTextColor="#9CA3AF"
                      value={signupOtpCode}
                      onChangeText={(text) => {
                        // 只允許數字，最多 6 位
                        const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                        setSignupOtpCode(numericText);
                      }}
                      editable={!signupOtpLoading}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, (signupOtpLoading || signupOtpCode.length !== 6) && styles.loginButtonDisabled]}
                  onPress={handleVerifySignup}
                  disabled={signupOtpLoading || signupOtpCode.length !== 6}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginButtonText}>
                    {signupOtpLoading ? '驗證中...' : '驗證'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.signUpLink}
                  onPress={() => {
                    setSignupStep('form');
                    setSignupOtpCode('');
                  }}
                  disabled={signupOtpLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signUpLinkText}>
                    返回修改 Email
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* 登入/註冊表單 */
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
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    setSignupStep('form');
                    setSignupOtpCode('');
                  }}
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
            )}
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
          setForgotPasswordStep('email');
          setForgotPasswordEmail('');
          setOtpCode('');
          setNewPassword('');
          setConfirmPassword('');
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
              setForgotPasswordStep('email');
              setForgotPasswordEmail('');
              setOtpCode('');
              setNewPassword('');
              setConfirmPassword('');
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
                      setForgotPasswordStep('email');
                      setForgotPasswordEmail('');
                      setOtpCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Step 1: 輸入 Email */}
                {forgotPasswordStep === 'email' && (
                  <>
                    <Text style={styles.modalDescription}>
                      請輸入您的 Email，我們將寄送 6 位數驗證碼給您。
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
                          setForgotPasswordStep('email');
                          setForgotPasswordEmail('');
                        }}
                        disabled={forgotPasswordLoading}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalCancelButtonText}>取消</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalSendButton, forgotPasswordLoading && styles.modalSendButtonDisabled]}
                        onPress={handleSendOtp}
                        disabled={forgotPasswordLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalSendButtonText}>
                          {forgotPasswordLoading ? '發送中...' : '發送驗證碼'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Step 2: 驗證碼與重設密碼 */}
                {forgotPasswordStep === 'otp' && (
                  <>
                    <Text style={styles.modalDescription}>
                      我們已發送 6 位數驗證碼到 {forgotPasswordEmail}，請輸入驗證碼並設定新密碼。
                    </Text>

                    {/* 驗證碼輸入框 */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="keypad-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="請輸入 6 位數驗證碼"
                          placeholderTextColor="#9CA3AF"
                          value={otpCode}
                          onChangeText={(text) => {
                            // 只允許數字，最多 6 位
                            const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                            setOtpCode(numericText);
                          }}
                          editable={!otpLoading}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus
                        />
                      </View>
                    </View>

                    {/* 新密碼輸入框 */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="新密碼（至少 6 個字元）"
                          placeholderTextColor="#9CA3AF"
                          value={newPassword}
                          onChangeText={setNewPassword}
                          editable={!otpLoading}
                          secureTextEntry
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    {/* 確認密碼輸入框 */}
                    <View style={styles.modalInputContainer}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="確認新密碼"
                          placeholderTextColor="#9CA3AF"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          editable={!otpLoading}
                          secureTextEntry
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <View style={styles.modalButtonGroup}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => {
                          setForgotPasswordStep('email');
                          setOtpCode('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        disabled={otpLoading}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalCancelButtonText}>返回</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modalSendButton,
                          (otpLoading || otpCode.length !== 6 || !newPassword.trim() || newPassword.length < 6 || newPassword !== confirmPassword) &&
                          styles.modalSendButtonDisabled,
                        ]}
                        onPress={handleVerifyAndReset}
                        disabled={
                          otpLoading ||
                          otpCode.length !== 6 ||
                          !newPassword.trim() ||
                          newPassword.length < 6 ||
                          newPassword !== confirmPassword
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalSendButtonText}>
                          {otpLoading ? '處理中...' : '確認重設'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
  verifyDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
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
