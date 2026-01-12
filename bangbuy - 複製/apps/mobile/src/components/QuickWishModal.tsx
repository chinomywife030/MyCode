import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert, ScrollView, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { CountryChip } from '@/src/components/CountryChip';
import { createWish } from '@bangbuy/core';
import { getCurrentUser } from '@/src/lib/auth';

interface QuickWishModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void; // 成功创建后刷新列表
}

// ✅ 快速国家选择（热门国家）
const QUICK_COUNTRIES = [
  { code: 'JP', name: '日本', emoji: '🇯🇵' },
  { code: 'KR', name: '韓國', emoji: '🇰🇷' },
  { code: 'US', name: '美國', emoji: '🇺🇸' },
  { code: 'GB', name: '英國', emoji: '🇬🇧' },
  { code: 'FR', name: '法國', emoji: '🇫🇷' },
];

export function QuickWishModal({ visible, onClose, onSuccess }: QuickWishModalProps) {
  const [itemName, setItemName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ✅ 自动聚焦输入框
  useEffect(() => {
    if (visible && inputRef.current) {
      // 延迟一下确保 Modal 已完全显示
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  // ✅ 关闭时重置表单
  const handleClose = () => {
    setItemName('');
    setSelectedCountry(null);
    setBudget('');
    setSubmitting(false);
    onClose();
  };

  // ✅ 提交处理
  const handleSubmit = async () => {
    // 验证：只有 item_name 是必填
    if (!itemName.trim()) {
      Alert.alert('提示', '請輸入想買的商品名稱');
      return;
    }

    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    setSubmitting(true);

    try {
      // 计算 30 天后的日期
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const deadlineISO = deadline.toISOString().split('T')[0]; // YYYY-MM-DD 格式

      // ✅ 确保 budget 如果是空字符串或无效值，发送 0 而不是 undefined/null
      const budgetValue = budget.trim() ? parseFloat(budget.trim()) : 0;
      const finalBudget = isNaN(budgetValue) || budgetValue <= 0 ? 0 : budgetValue;

      // ✅ 确保 targetCountry 有默认值（如果为 null 或 'OTHER'，使用 'JP'）
      const finalCountry = (selectedCountry === 'OTHER' || !selectedCountry) ? 'JP' : selectedCountry;

      // 准备创建参数
      const params = {
        title: itemName.trim(),
        description: undefined,
        budget: finalBudget, // ✅ 确保永远是数字，不会是 undefined/null
        price: undefined,
        commission: undefined,
        productUrl: undefined,
        targetCountry: finalCountry, // ✅ 确保有默认值
        category: 'other',
        deadline: deadlineISO,
      };

      const result = await createWish(params);

      if (result.success) {
        Alert.alert('成功', '許願成功！', [
          {
            text: '確定',
            onPress: () => {
              handleClose();
              onSuccess(); // ✅ 触发刷新
            },
          },
        ]);
      } else {
        Alert.alert('錯誤', result.error || '創建失敗，請稍後再試');
      }
    } catch (error: any) {
      console.error('[QuickWishModal] Submit error:', error);
      Alert.alert('錯誤', error.message || '創建失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      {/* 1. Outer Keyboard avoider fills the whole screen */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* 2. Backdrop (Dark Overlay) - centers the card */}
        <Pressable
          onPress={handleClose}
          style={styles.backdrop}
        >
          {/* 3. The White Card (Prevent closing when tapping inside) */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {/* 4. ScrollView ensures content isn't cut off on small screens/keyboard up */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>快速許願</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={10}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Input 1: Description (Make it tall!) */}
              <TextInput
                ref={inputRef}
                placeholder="想買什麼？例如：大阪環球影城爆米花桶"
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.descriptionInput}
                value={itemName}
                onChangeText={setItemName}
                autoFocus={false} // Handled by useEffect
                returnKeyType="next"
                textAlignVertical="top"
                editable={!submitting}
              />

              {/* Input 2: Country Chips (Visible!) */}
              <Text style={styles.inputLabel}>選擇國家 (選填)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.countryChipsScroll}
                contentContainerStyle={styles.countryChipsContainer}
              >
                {QUICK_COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryChip,
                      selectedCountry === country.code && styles.countryChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedCountry(
                        selectedCountry === country.code ? null : country.code
                      );
                    }}
                    activeOpacity={0.7}
                    disabled={submitting}
                  >
                    <Text style={styles.countryChipEmoji}>{country.emoji}</Text>
                    <Text
                      style={[
                        styles.countryChipText,
                        selectedCountry === country.code && styles.countryChipTextSelected,
                      ]}
                    >
                      {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.countryChip,
                    selectedCountry === 'OTHER' && styles.countryChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(selectedCountry === 'OTHER' ? null : 'OTHER');
                  }}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.countryChipText,
                      selectedCountry === 'OTHER' && styles.countryChipTextSelected,
                    ]}
                  >
                    其他
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Input 3: Budget */}
              <Text style={styles.inputLabel}>最高預算 (選填)</Text>
              <TextInput
                placeholder="NT$ 預算金額"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.budgetInput}
                value={budget}
                onChangeText={(text) => {
                  // 只允许数字
                  const numericText = text.replace(/[^0-9]/g, '');
                  setBudget(numericText);
                }}
                returnKeyType="done"
                editable={!submitting}
              />

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !itemName.trim()}
                style={[
                  styles.submitButton,
                  (submitting || !itemName.trim()) && styles.submitButtonDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? '送出中...' : '立即送出'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: fontWeight.normal,
  },
  descriptionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    height: 100, // Fixed height for textarea feel
    textAlignVertical: 'top',
    marginBottom: 15,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: fontWeight.medium,
  },
  countryChipsScroll: {
    marginBottom: 15,
    maxHeight: 40,
  },
  countryChipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  countryChipSelected: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  countryChipEmoji: {
    fontSize: 16,
  },
  countryChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  countryChipTextSelected: {
    color: '#FFFFFF',
  },
  budgetInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: fontWeight.bold,
    fontSize: 16,
  },
});

