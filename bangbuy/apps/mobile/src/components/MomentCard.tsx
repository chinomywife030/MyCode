import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

interface MomentCardProps {
  id: string;
  description?: string;
  images?: string[];
  location?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  onChatPress: () => void;
}

/**
 * 旅行時刻卡片：Instagram 風格垂直卡片
 * - Header: 用戶頭像 + 名稱 + 相對時間
 * - Image: 大圖（4:3 或 1:1 比例）
 * - Footer: 描述（2-3行）、位置（Pin 圖標）、聊天按鈕
 */
export function MomentCard({
  id,
  description,
  images = [],
  location,
  createdAt,
  user,
  onChatPress,
}: MomentCardProps) {
  // 格式化相對時間（例如："2 hours ago"）
  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '剛剛';
      if (diffMins < 60) return `${diffMins} 分鐘前`;
      if (diffHours < 24) return `${diffHours} 小時前`;
      if (diffDays < 7) return `${diffDays} 天前`;
      
      // 超過一週，顯示日期
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const firstImage = images?.[0];
  const relativeTime = formatRelativeTime(createdAt);
  const userName = user?.name || '匿名用戶';
  const userAvatar = user?.avatarUrl;

  return (
    <View style={styles.card}>
      {/* Header: 用戶資訊 + 時間 */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userTextContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.timeText}>{relativeTime}</Text>
          </View>
        </View>
      </View>

      {/* Image: 大圖（4:3 比例） */}
      {firstImage ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: firstImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={48} color={colors.textLight} />
        </View>
      )}

      {/* Footer: 描述 + 位置 + 聊天按鈕 */}
      <View style={styles.footer}>
        {description && (
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        )}

        <View style={styles.footerRow}>
          {location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.chatButton}
            onPress={onChatPress}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.brandOrange} />
            <Text style={styles.chatButtonText}>聊天</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
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
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: spacing.md,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    flex: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.brandOrange,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  chatButtonText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
});


