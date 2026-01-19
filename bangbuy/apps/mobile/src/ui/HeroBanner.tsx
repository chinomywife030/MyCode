import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

type HeroBannerVariant = 'orange' | 'blue';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  buttonText: string;
  onButtonPress?: () => void;
  variant?: HeroBannerVariant;
}

/**
 * Hero Banner：支援橘色/藍色漸層背景，包含標題、副標題和白色圓角按鈕
 */
export function HeroBanner({
  title,
  subtitle,
  buttonText,
  onButtonPress,
  variant = 'orange'
}: HeroBannerProps) {
  // Defensive: Handle missing colors gracefully
  const safeOrangeGradient = colors?.brandOrangeGradient || ['#FF7A00', '#FF9500'];
  const safeBlueGradient = colors?.brandBlueGradient || ['#007AFF', '#00C6FF'];

  const gradientColors = variant === 'blue'
    ? safeBlueGradient
    : safeOrangeGradient;

  const buttonTextColor = variant === 'blue'
    ? (colors?.brandBlue || '#007AFF')
    : (colors?.brandOrange || '#FF7A00');

  // Defensive: Safe handler
  const handlePress = () => {
    onButtonPress?.();
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title || '標題'}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>
            {buttonText || '按鈕'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: '#ffffff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

