/**
 * 分類選擇器組件（Chips）
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

const CATEGORIES = [
  { id: 'toy', label: '玩具公仔' },
  { id: 'luxury', label: '精品' },
  { id: 'electronics', label: '3C 電子' },
  { id: 'fashion', label: '服飾' },
  { id: 'beauty', label: '美妝' },
  { id: 'snacks', label: '零食食品' },
  { id: 'pharmacy', label: '藥妝' },
  { id: 'sports', label: '運動用品' },
  { id: 'home', label: '居家用品' },
  { id: 'other', label: '其他' },
];

interface CategoryChipsProps {
  value?: string; // 選中的分類 ID
  onValueChange: (categoryId: string | undefined) => void;
  label?: string;
}

export function CategoryChips({
  value,
  onValueChange,
  label = '商品分類',
}: CategoryChipsProps) {
  const handleToggle = (categoryId: string) => {
    if (value === categoryId) {
      // 如果已選中，則取消選擇
      onValueChange(undefined);
    } else {
      onValueChange(categoryId);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {CATEGORIES.map((category) => {
          const isSelected = value === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => handleToggle(category.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipsContainer: {
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
});

