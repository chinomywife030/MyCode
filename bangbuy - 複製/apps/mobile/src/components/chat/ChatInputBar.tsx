import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '@/src/theme/tokens';

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
}

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  disabled = false,
  sending = false,
}: ChatInputBarProps) {
  const canSend = value.trim().length > 0 && !sending && !disabled;

  return (
    <View style={styles.container}>
      {/* 膠囊狀輸入框 */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="輸入訊息..."
          placeholderTextColor="#8E8E93"
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
          editable={!disabled && !sending}
          textAlignVertical="center"
        />
      </View>

      {/* 右側發送按鈕（藍色 Icon） */}
      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Ionicons
          name="send"
          size={20}
          color={canSend ? '#007AFF' : '#C7C7CC'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    backgroundColor: '#FFFFFF',
    // 頂部輕微陰影
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3, // Android 陰影
  },
  inputWrapper: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: '#F2F2F7', // 淺灰色背景（膠囊狀）
    borderRadius: 20, // 膠囊狀圓角
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    justifyContent: 'center',
  },
  input: {
    fontSize: fontSize.base,
    color: colors.text,
    padding: 0,
    margin: 0,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent', // 透明背景，只顯示 Icon
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});




