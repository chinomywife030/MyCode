import { StyleSheet, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { colors, radius, spacing, shadows } from '@/src/theme/tokens';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * 通用卡片組件：白底、圓角 16、柔和陰影
 */
export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
});








