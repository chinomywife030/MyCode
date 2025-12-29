import { StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createWishReply } from '@/src/lib/replies';

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

    setSubmitting(true);
    try {
      const result = await createWishReply(id as string, message);
      
      if (result.success) {
        // 成功後返回詳情頁
        router.back();
        // 使用 setTimeout 確保返回後再顯示提示（因為 router.back() 是異步的）
        setTimeout(() => {
          Alert.alert('成功', '已送出');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            我要回覆/報價
          </ThemedText>
        </ThemedView>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              訊息內容
            </ThemedText>
            <TextInput
              style={styles.textInput}
              placeholder="請輸入您的回覆或報價訊息..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={8}
              value={message}
              onChangeText={setMessage}
              editable={!submitting}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <ThemedText style={styles.submitButtonText}>
              {submitting ? '送出中...' : '送出'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <ThemedText style={styles.cancelButtonText}>取消</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    opacity: 0.8,
  },
  textInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    opacity: 0.7,
  },
});

