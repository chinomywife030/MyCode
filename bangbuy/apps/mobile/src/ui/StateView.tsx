import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

interface StateViewProps {
  type: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
}

/**
 * 統一的狀態視圖組件
 * - loading: 載入中
 * - error: 錯誤狀態
 * - empty: 空狀態
 */
export function StateView({
  type,
  message,
  onRetry,
  retryText = '重試',
  icon,
  iconSize = 48,
  iconColor,
}: StateViewProps) {
  const defaultMessages = {
    loading: '載入中...',
    error: '發生錯誤',
    empty: '目前沒有資料',
  };

  const defaultIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    loading: 'reload-outline',
    error: 'alert-circle-outline',
    empty: 'file-tray-outline',
  };

  const defaultIconColors = {
    loading: colors.brandOrange,
    error: colors.error,
    empty: colors.textMuted,
  };

  const displayMessage = message || defaultMessages[type];
  const displayIcon = icon || defaultIcons[type];
  const displayIconColor = iconColor || defaultIconColors[type];

  if (type === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brandOrange} />
        <Text style={styles.message}>{displayMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name={displayIcon} size={iconSize} color={displayIconColor} />
      <Text style={[styles.message, type === 'error' && styles.errorMessage]}>
        {displayMessage}
      </Text>
      {type === 'error' && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>{retryText}</Text>
        </TouchableOpacity>
      )}
      {type === 'empty' && onRetry && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRetry} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color={colors.brandOrange} />
          <Text style={styles.refreshButtonText}>重新整理</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    minHeight: 300,
  },
  message: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: fontSize.base * 1.5,
  },
  errorMessage: {
    color: colors.error,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  refreshButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brandOrange,
  },
  refreshButtonText: {
    color: colors.brandOrange,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.sm,
  },
});





