/**
 * 帶有未讀數 Badge 的圖標元件（共用元件，用於通知、訊息等）
 */

import { StyleSheet, View, Text } from 'react-native';
import { ReactNode } from 'react';
import { colors, fontSize, fontWeight } from '@/src/theme/tokens';

interface IconWithBadgeProps {
  icon: ReactNode;
  count: number;
  size?: number;
}

export function IconWithBadge({
  icon,
  count,
  size = 24,
}: IconWithBadgeProps) {
  // Badge 顯示規則：
  // - count <= 0：不顯示
  // - 1~99：顯示數字
  // - >= 100：顯示 "99+"
  const shouldShowBadge = count > 0;
  const badgeText = count >= 100 ? '99+' : count.toString();

  return (
    <View style={styles.container}>
      {icon}
      {shouldShowBadge && (
        <View style={[styles.badge, { minWidth: count >= 100 ? 28 : 18, height: 18 }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444', // 紅色背景
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF', // 白色邊框，增加對比度
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: fontWeight.bold,
    lineHeight: 12,
    textAlign: 'center',
  },
});

// 向後兼容：保留舊名稱的 export
export const NotificationIconWithBadge = IconWithBadge;
