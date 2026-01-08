import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

interface TripCardProps {
  id: string;
  destination: string;
  description?: string;
  dateRange?: string;
  ownerName?: string;
  ownerAvatar?: string;
  onPress: () => void;
  onMessagePress: () => void;
}

/**
 * 行程卡片：白底、圓角 16、陰影
 * - 左上顯示 avatar + username
 * - 標題：前往 {destination}
 * - 次資訊：一段摘要（最多 2 行）
 * - 右上日期範圍 badge
 * - 右下主按鈕「私訊」（藍色）
 */
export function TripCard({
  id,
  destination,
  description,
  dateRange,
  ownerName,
  ownerAvatar,
  onPress,
  onMessagePress,
}: TripCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* 頂部區域：用戶資訊 + 日期 */}
      <View style={styles.topRow}>
        <View style={styles.userInfo}>
          {ownerAvatar ? (
            <Image source={{ uri: ownerAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {ownerName ? ownerName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <View style={styles.userTextContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {ownerName || '匿名用戶'}
            </Text>
            <Text style={styles.userRole}>代購夥伴</Text>
          </View>
        </View>
        
        {dateRange && (
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>
        )}
      </View>

      {/* 標題 */}
      <Text style={styles.title}>前往 {destination}</Text>

      {/* 描述摘要 */}
      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      {/* 底部區域：私訊按鈕 + 查看行程按鈕 */}
      <View style={styles.bottomRow}>
        {/* 次按鈕：查看行程 */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onPress();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>查看行程</Text>
        </TouchableOpacity>
        
        {/* 主按鈕：私訊 */}
        <TouchableOpacity
          style={styles.messageButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onMessagePress();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.messageButtonText}>私訊</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  userTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  userName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  userRole: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  tagContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  preferenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  preferenceText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.brandBlue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  secondaryButtonText: {
    color: colors.brandBlue,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  messageButton: {
    backgroundColor: colors.brandBlue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});




