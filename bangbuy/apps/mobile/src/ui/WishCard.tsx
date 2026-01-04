import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { PeekImageCarousel } from '@/src/components/PeekImageCarousel';

interface WishCardProps {
  id: string;
  title: string;
  country?: string;
  images?: string[];
  budget?: number;
  buyer?: {
    name?: string;
    avatarUrl?: string;
  };
  status?: string;
  onPress: () => void;
  onMessagePress?: () => void;
}

/**
 * Wish 卡片：符合 Marketplace Feed 样式
 * - 图片轮播（固定高度 240px）
 * - 左上角国家 badge
 * - 用户信息（头像、名称、副标）
 * - 状态 badge
 * - 标题（最多2行）
 * - 价格显示
 * - 两个 CTA 按钮
 */
export function WishCard({ 
  id, 
  title, 
  country, 
  images = [], 
  budget,
  buyer,
  status,
  onPress, 
  onMessagePress 
}: WishCardProps) {

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'in_progress': return '進行中';
      case 'done': return '已完成';
      default: return '待處理';
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'in_progress': return { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE', color: '#1E40AF' };
      case 'done': return { backgroundColor: '#FED7AA', borderColor: '#FDBA74', color: '#9A3412' };
      default: return { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', color: '#4B5563' };
    }
  };

  const statusStyle = getStatusStyle(status);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.95}
    >
      {/* 图片区域 - Peek Carousel，固定 4:3 比例 */}
      <View style={styles.imageContainer} pointerEvents="box-none">
        {images?.length ? (
          <PeekImageCarousel images={images} aspectRatio={4/3} peek={32} gap={10} />
        ) : (
          <View style={{ width: "100%", aspectRatio: 4/3, borderRadius: 16, backgroundColor: "#F2F4F7" }} />
        )}

        {/* 左上角国家 badge */}
        {country && (
          <View style={styles.countryBadge} pointerEvents="none">
            <Text style={styles.countryEmoji}>
              {country === 'JP' ? '🇯🇵' : country === 'KR' ? '🇰🇷' : '🌍'}
            </Text>
            <Text style={styles.countryText}>{country}</Text>
          </View>
        )}
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {/* 用户信息行 */}
        <View style={styles.userRow}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {buyer?.avatarUrl ? (
                <Image
                  source={{ uri: buyer.avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {buyer?.name?.[0] || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.userName} numberOfLines={1}>
                {buyer?.name || '使用者'}
              </Text>
              <Text style={styles.userSubtitle}>需要幫助</Text>
            </View>
          </View>
          {/* 状态 badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>

        {/* 标题 - 最多2行 */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* 价格 */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>NT$</Text>
          <Text style={styles.priceValue}>
            {budget ? budget.toLocaleString() : '0'}
          </Text>
        </View>

        {/* CTA 按钮区域 */}
        <View style={styles.ctaContainer}>
          {/* Primary 按钮：我要接单报价 */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onPress();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>我要接單報價</Text>
          </TouchableOpacity>

          {/* Secondary 按钮：先私讯询问 */}
          {onMessagePress && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onMessagePress();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>先私訊詢問</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // rounded-2xl
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB', // 淡边框
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.3,
  },
  countryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20, // 胶囊样式
    zIndex: 10,
    ...shadows.sm,
  },
  countryEmoji: {
    fontSize: 16,
  },
  countryText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#EA580C', // 橘色
  },
  content: {
    padding: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    color: '#6B7280',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    color: '#374151',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: fontWeight.normal,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: '#111827',
    marginBottom: spacing.md,
    lineHeight: 22,
    minHeight: 44, // 确保2行高度
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#EA580C', // 橘色
  },
  ctaContainer: {
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: '#EA580C', // 橘色
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
});
