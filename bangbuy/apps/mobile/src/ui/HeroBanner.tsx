import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

type HeroBannerVariant = 'orange' | 'blue';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  buttonText: string;
  onButtonPress: () => void;
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
  console.count('HERO_RENDER');
  const gradientColors = variant === 'blue' 
    ? colors.brandBlueGradient 
    : colors.brandOrangeGradient;
  
  const buttonTextColor = variant === 'blue' 
    ? colors.brandBlue 
    : colors.brandOrange;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <TouchableOpacity style={styles.button} onPress={onButtonPress} activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>{buttonText}</Text>
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

