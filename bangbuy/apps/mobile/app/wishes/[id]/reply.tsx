import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Input } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { createWishReply } from '@/src/lib/replies';
import { requireAuth } from '@/src/lib/auth';

export default function ReplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('提示', '請輸入訊息內容');
      return;
    }

    if (!id) {
      Alert.alert('錯誤', '找不到願望單 ID');
      return;
    }

    // 檢查登入狀態
    const replyRoute = `/wish/${id}/reply`;
    const isAuthenticated = await requireAuth(replyRoute);
    if (!isAuthenticated) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await createWishReply(id as string, message);

      if (result.success) {
        router.back();
        setTimeout(() => {
          Alert.alert('成功', '已送出回覆');
        }, 300);
      } else {
        Alert.alert('錯誤', result.error || '送出失敗');
      }
    } catch (error: any) {
      console.error('[ReplyScreen] Submit error:', error);
      Alert.alert('錯誤', error.message || '送出失敗');
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>回覆/報價</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 提示卡片 */}
          <Card style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.brandBlue} />
              <Text style={styles.tipTitle}>回覆小提示</Text>
            </View>
            <Text style={styles.tipText}>
              • 說明你可以提供的服務或商品{'\n'}
              • 提供你的報價與運費說明{'\n'}
              • 標明你的行程日期或預計到貨時間
            </Text>
          </Card>

          {/* 表單 */}
          <Card style={styles.formCard}>
            <Input
              label="訊息內容"
              placeholder="請輸入您的回覆或報價訊息...&#10;&#10;例如：&#10;我可以幫你代購這個商品！&#10;商品價格：NT$500&#10;代購費：NT$100&#10;運費：NT$60&#10;預計 3/15 可寄出"
              value={message}
              onChangeText={setMessage}
              editable={!submitting}
              multiline
              numberOfLines={10}
              style={styles.messageInput}
            />

            <Button
              title={submitting ? '送出中...' : '送出回覆'}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
            />

            <Button
              title="取消"
              onPress={handleBack}
              variant="outline"
              fullWidth
              size="lg"
              disabled={submitting}
              style={styles.cancelButton}
            />
          </Card>
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
  tipCard: {
    marginBottom: spacing.md,
    backgroundColor: '#eff6ff', // Light blue background
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tipTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.brandBlue,
    marginLeft: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: fontSize.sm * 1.6,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  messageInput: {
    height: 200,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
});
