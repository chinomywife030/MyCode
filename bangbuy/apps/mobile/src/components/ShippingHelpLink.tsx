/**
 * 運回台灣方式說明連結組件
 * 輕量級文字連結，用於引導用戶查看運送方式說明
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, fontSize } from '@/src/theme/tokens';

interface ShippingHelpLinkProps {
  /**
   * 變體：'create' 用於發布頁面，'detail' 用於詳情頁面
   */
  variant?: 'create' | 'detail';
}

export function ShippingHelpLink({ variant = 'create' }: ShippingHelpLinkProps) {
  const handlePress = () => {
    router.push('/help/shipping');
  };

  if (variant === 'create') {
    // 發布頁面：一行文字 + 可點擊連結
    return (
      <View style={styles.createContainer}>
        <Text style={styles.createText}>
          📦 不確定商品要怎麼運回台灣？{' '}
          <Text style={styles.createLink} onPress={handlePress}>
            查看常見運回方式
          </Text>
        </Text>
      </View>
    );
  }

  // 詳情頁面：一行問句 + 文字連結
  return (
    <View style={styles.detailContainer}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.detailText}>
          ❓ 不確定這個商品要怎麼運回台灣？{' '}
          <Text style={styles.detailLink}>查看運送方式說明</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  createContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  createText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  createLink: {
    color: colors.brandOrange,
    textDecorationLine: 'underline',
  },
  detailContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  detailLink: {
    color: colors.brandOrange,
    textDecorationLine: 'underline',
  },
});
