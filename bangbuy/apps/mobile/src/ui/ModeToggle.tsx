import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

export type Mode = 'shopper' | 'buyer';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

/**
 * 模式切換組件
 * 用於在「代購（接單）模式」和「買家模式」之間切換
 */
export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const handleModeChange = (newMode: Mode) => {
    if (newMode !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeChange(newMode);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          mode === 'shopper' && styles.buttonActive,
        ]}
        onPress={() => handleModeChange('shopper')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>✈️</Text>
        <Text style={[styles.text, mode === 'shopper' && styles.textActive]}>
          代購
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          mode === 'buyer' && styles.buttonActive,
        ]}
        onPress={() => handleModeChange('buyer')}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>🛒</Text>
        <Text style={[styles.text, mode === 'buyer' && styles.textActive]}>
          買家
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  buttonActive: {
    backgroundColor: colors.bgCard,
    ...shadows.sm,
  },
  icon: {
    fontSize: fontSize.base,
    marginRight: spacing.xs,
  },
  text: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  textActive: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});





