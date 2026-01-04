import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { Button } from './Button';

export interface FilterOptions {
  country?: string;
  category?: string;
  status?: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onClear: () => void;
  initialFilters?: FilterOptions;
}

const COUNTRIES = [
  { value: 'JP', label: '🇯🇵 日本' },
  { value: 'KR', label: '🇰🇷 韓國' },
  { value: 'US', label: '🇺🇸 美國' },
  { value: 'CN', label: '🇨🇳 中國' },
  { value: 'TH', label: '🇹🇭 泰國' },
];

const CATEGORIES = [
  { value: 'toy', label: '🧸 玩具' },
  { value: 'luxury', label: '👜 精品' },
  { value: 'digital', label: '📱 3C' },
  { value: 'clothes', label: '👕 服飾' },
  { value: 'beauty', label: '💄 美妝' },
  { value: 'food', label: '🍜 零食' },
  { value: 'medicine', label: '💊 藥妝' },
  { value: 'sports', label: '⚽ 運動' },
  { value: 'home', label: '🏠 居家' },
  { value: 'other', label: '📦 其他' },
];

const STATUSES = [
  { value: 'open', label: '進行中' },
  { value: 'closed', label: '已結束' },
  { value: 'all', label: '全部' },
];

/**
 * 篩選 Modal 組件
 */
export function FilterModal({
  visible,
  onClose,
  onApply,
  onClear,
  initialFilters = {},
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const handleSelect = (type: 'country' | 'category' | 'status', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? undefined : value,
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({});
    onClear();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>篩選條件</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 國家篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>購買國家</Text>
              <View style={styles.optionsContainer}>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country.value}
                    style={[
                      styles.optionButton,
                      filters.country === country.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelect('country', country.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.country === country.value && styles.optionTextSelected,
                      ]}
                    >
                      {country.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 分類篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>分類</Text>
              <View style={styles.optionsContainer}>
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.optionButton,
                      filters.category === category.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelect('category', category.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.category === category.value && styles.optionTextSelected,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 狀態篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>狀態</Text>
              <View style={styles.optionsContainer}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.optionButton,
                      filters.status === status.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelect('status', status.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.status === status.value && styles.optionTextSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="清除"
              onPress={handleClear}
              variant="outline"
              size="md"
              style={styles.clearButton}
            />
            <Button
              title="套用"
              onPress={handleApply}
              variant="primary"
              size="md"
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  optionButtonSelected: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});

