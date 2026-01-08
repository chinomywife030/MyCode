/**
 * 國家 Chip 元件
 * 統一顯示國家旗幟和代碼
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCountryFlag } from '@/src/utils/countryFlag';

interface CountryChipProps {
  countryCode: string | null | undefined;
  showCode?: boolean; // 是否顯示代碼（預設 true）
  size?: 'sm' | 'md' | 'lg'; // 尺寸
  variant?: 'default' | 'outline'; // 樣式變體
}

export function CountryChip({
  countryCode,
  showCode = true,
  size = 'md',
  variant = 'default',
}: CountryChipProps) {
  if (!countryCode) {
    return null;
  }

  const flag = getCountryFlag(countryCode);
  const sizeStyles = {
    sm: { padding: spacing.xs, fontSize: fontSize.xs, iconSize: 12 },
    md: { padding: spacing.sm, fontSize: fontSize.sm, iconSize: 16 },
    lg: { padding: spacing.md, fontSize: fontSize.base, iconSize: 20 },
  }[size];

  const variantStyles = {
    default: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
  }[variant];

  return (
    <View style={[styles.container, variantStyles, { padding: sizeStyles.padding }]}>
      {flag ? (
        <Text style={[styles.flag, { fontSize: sizeStyles.iconSize }]}>{flag}</Text>
      ) : (
        <Ionicons
          name="globe-outline"
          size={sizeStyles.iconSize}
          color={colors.textMuted}
          style={styles.icon}
        />
      )}
      {showCode && (
        <Text style={[styles.code, { fontSize: sizeStyles.fontSize }]}>{countryCode}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  flag: {
    // 旗幟 emoji
  },
  icon: {
    marginRight: -spacing.xs, // 調整間距
  },
  code: {
    fontWeight: fontWeight.bold,
    color: '#EA580C', // 橘色，與 WishCard 一致
  },
});


