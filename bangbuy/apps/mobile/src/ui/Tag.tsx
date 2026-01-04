import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

interface TagProps {
  label: string;
  variant?: 'default' | 'orange';
}

/**
 * Tag 組件：國家標籤等
 */
export function Tag({ label, variant = 'default' }: TagProps) {
  return (
    <View style={[styles.tag, variant === 'orange' && styles.tagOrange]}>
      <Text style={[styles.tagText, variant === 'orange' && styles.tagTextOrange]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagOrange: {
    backgroundColor: colors.brandOrangeLight,
    borderColor: colors.brandOrange,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tagTextOrange: {
    color: colors.brandOrangeDark,
  },
});





