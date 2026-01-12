/**
 * ImmoScout 風格 DiscoveryCard
 * 設計參考商品卡片風格：上圖下資訊
 * 
 * 結構：
 * - 上半部：大圖 + 底部漸層 overlay（標題、標籤）
 * - 下半部：白底資訊區（作者、地點、CTA）
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { CountryChip } from '@/src/components/CountryChip';
import type { Discovery } from '@/src/lib/discoveries';
import {
  immoColors,
  immoSpacing,
  immoRadius,
  immoTypography,
  immoShadows,
} from './theme';

// ============================================
// Display Model Adapter (UI-only 資料轉換)
// ============================================
export interface ImmoDiscoveryDisplayModel {
  id: string;
  title: string;
  country?: string;
  city?: string;
  /** 單張圖片（向後兼容） */
  image?: string;
  /** 多張圖片（用於輪播） */
  images?: string[];
  authorName: string;
  authorInitial: string;
  /** 作者 ID（用於判斷是否為自己） */
  authorId?: string;
}

/**
 * 將原始 Discovery 資料轉換為 Display Model
 * 純 UI 格式化，不改變任何業務邏輯
 */
export function normalizeDiscoveryForCard(discovery: Discovery): ImmoDiscoveryDisplayModel {
  const authorName = discovery.profiles?.name || '匿名用戶';
  
  return {
    id: discovery.id,
    title: discovery.title,
    country: discovery.country,
    city: discovery.city,
    image: discovery.photos?.[0],
    images: discovery.photos || [],
    authorName,
    authorInitial: authorName.charAt(0).toUpperCase(),
    authorId: discovery.user_id,
  };
}

// ============================================
// Component Props
// ============================================
interface ImmoScoutDiscoveryCardProps {
  /** Display model */
  display: ImmoDiscoveryDisplayModel;
  /** 點擊卡片（進入詳情頁） */
  onPress: () => void;
  /** 「私訊」按鈕點擊事件 */
  onInterestPress?: () => void;
  /** 是否顯示「私訊」按鈕（預設 true） */
  showInterestButton?: boolean;
  /** 當前用戶 ID（用於判斷是否為自己發布的） */
  currentUserId?: string;
}

// ============================================
// Component
// ============================================
export function ImmoScoutDiscoveryCard({
  display,
  onPress,
  onInterestPress,
  showInterestButton = true,
  currentUserId,
}: ImmoScoutDiscoveryCardProps) {
  // 取得圖片陣列（優先使用 images，fallback 到 image）
  const imageList = display.images && display.images.length > 0 
    ? display.images 
    : display.image 
      ? [display.image] 
      : [];
  
  const coverImage = imageList[0] || null;
  
  // 判斷是否為自己發布的
  const isOwnDiscovery = currentUserId && display.authorId && currentUserId === display.authorId;
  
  // 構建地點文字
  const locationText = [display.city, display.country].filter(Boolean).join(', ') || display.country || '';

  return (
    <View style={styles.card}>
      {/* ============================================ */}
      {/* Image Area with Overlay */}
      {/* ============================================ */}
      <View style={styles.imageContainer}>
        {coverImage ? (
          <ExpoImage
            source={{ uri: coverImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>無圖片</Text>
          </View>
        )}

        {/* Country Chip (Top-Left) */}
        {display.country && (
          <View style={styles.countryBadge}>
            <CountryChip countryCode={display.country} size="sm" />
          </View>
        )}

        {/* Bottom Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.overlayContent}>
            {/* 標題 */}
            <Text style={styles.overlayTitle} numberOfLines={2}>
              {display.title}
            </Text>
            
            {/* 左下標籤 */}
            <View style={styles.overlayTag}>
              <Text style={styles.overlayTagText}>
                {display.country ? `旅途發現 · ${display.country}` : '旅途發現'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ============================================ */}
      {/* Content Area (White Background) */}
      {/* ============================================ */}
      <View style={styles.content}>
        {/* Author */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>{display.authorInitial}</Text>
          </View>
          <Text style={styles.authorName}>{display.authorName}</Text>
        </View>

        {/* Location */}
        {locationText && (
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
        )}

        {/* 「私訊」按鈕（唯一 CTA，滿寬、藍色） */}
        {showInterestButton && (
          <TouchableOpacity
            style={[
              styles.messageButton,
              isOwnDiscovery && styles.messageButtonDisabled,
            ]}
            onPress={isOwnDiscovery ? undefined : (onInterestPress || onPress)}
            disabled={isOwnDiscovery}
            activeOpacity={0.8}
          >
            <Text style={styles.messageButtonText}>
              {isOwnDiscovery ? '這是你發布的' : '私訊'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================
// Skeleton Loader
// ============================================
export function ImmoScoutDiscoveryCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.imageContainer, styles.skeletonImage]} />
      <View style={styles.content}>
        <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 14, marginTop: 8 }]} />
      </View>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  card: {
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: immoColors.borderLight,
    ...immoShadows.card,
  },
  // Image Area
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3, // 固定比例，避免裁切
    position: 'relative',
    backgroundColor: immoColors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: immoColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
  },
  countryBadge: {
    position: 'absolute',
    top: immoSpacing.sm,
    left: immoSpacing.sm,
    zIndex: 10,
  },
  // Gradient Overlay
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%', // 覆蓋下半部，從透明到深色
    justifyContent: 'flex-end',
    paddingHorizontal: immoSpacing.md,
    paddingBottom: immoSpacing.md,
  },
  overlayContent: {
    gap: immoSpacing.xs,
  },
  overlayTitle: {
    color: immoColors.white,
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.bold,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs / 2,
    borderRadius: immoRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  overlayTagText: {
    color: immoColors.white,
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.medium,
  },
  // Content Area
  content: {
    padding: immoSpacing.md,
    backgroundColor: immoColors.white,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: immoSpacing.xs,
    marginBottom: immoSpacing.xs,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: immoColors.tripPrimary, // 藍色，Buyer 模式主色
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.white,
  },
  authorName: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
    flex: 1,
  },
  locationText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textSecondary,
    marginBottom: immoSpacing.sm,
  },
  // Message Button (唯一 CTA，滿寬、藍色)
  messageButton: {
    backgroundColor: immoColors.tripPrimary, // 藍色，Buyer 模式主色
    borderRadius: immoRadius.md,
    paddingVertical: immoSpacing.md,
    paddingHorizontal: immoSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', // 滿寬
    marginTop: immoSpacing.xs,
  },
  messageButtonDisabled: {
    backgroundColor: immoColors.borderLight,
    opacity: 0.6,
  },
  messageButtonText: {
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.white,
  },
  // Skeleton
  skeletonImage: {
    aspectRatio: 4 / 3,
    backgroundColor: immoColors.background,
  },
  skeletonLine: {
    backgroundColor: immoColors.background,
    borderRadius: immoRadius.sm,
  },
});

export default ImmoScoutDiscoveryCard;
