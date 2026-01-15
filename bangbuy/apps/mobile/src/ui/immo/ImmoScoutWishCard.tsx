/**
 * ImmoScout 風格 WishCard
 * 設計參考 Immobilienscout24 的物件列表卡片風格
 * 
 * 結構：
 * - 上方多圖輪播（帶國旗/愛心）
 * - 下方資訊區：標題 > 次資訊 > 價格 > Actions（主 CTA 橘色 + 查看詳情）
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountryChip } from '@/src/components/CountryChip';
import { ImageCarousel } from '@/src/components/ImageCarousel';
import { ImmoCardActions } from './ImmoCardActions';
import {
  immoColors,
  immoSpacing,
  immoRadius,
  immoTypography,
  immoShadows,
} from './theme';
import { ImmoWishDisplayModel } from './immoAdapters';

// ============================================
// Component Props
// ============================================
interface ImmoScoutWishCardProps {
  /** 原始 display model */
  display: ImmoWishDisplayModel;
  /** 點擊卡片（進入詳情頁） */
  onPress: () => void;
  /** 點擊 CTA 按鈕（聯絡委託人） */
  onMessagePress: () => void;
  /** 是否正在載入中 */
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================
export function ImmoScoutWishCard({
  display,
  onPress,
  onMessagePress,
  isLoading = false,
}: ImmoScoutWishCardProps) {
  const [imageContainerSize, setImageContainerSize] = useState({ 
    width: 0, 
    height: 0 
  });

  // 取得圖片陣列（優先使用 images，fallback 到 image）
  const imageList = display.images && display.images.length > 0 
    ? display.images 
    : display.image 
      ? [display.image] 
      : [];

  // 計算圖片容器實際尺寸（4:3 比例）
  const handleImageContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      // 確保尺寸與容器一致（aspectRatio 會自動計算高度）
      setImageContainerSize({ width, height });
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* ============================================ */}
      {/* Image Carousel Area */}
      {/* ============================================ */}
      <View 
        style={styles.imageContainer}
        onLayout={handleImageContainerLayout}
      >
        {imageContainerSize.width > 0 && imageContainerSize.height > 0 && (
          <ImageCarousel
            images={imageList}
            width={imageContainerSize.width}
            height={imageContainerSize.height}
            showIndicator={imageList.length > 1}
          />
        )}

        {/* Country Chip (Top-Left) */}
        {display.country && (
          <View style={styles.countryBadge}>
            <CountryChip countryCode={display.country} size="sm" />
          </View>
        )}

        {/* Status Badge (Bottom-Left) */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{display.statusText}</Text>
        </View>
      </View>

      {/* ============================================ */}
      {/* Content Area */}
      {/* ============================================ */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {display.title}
        </Text>

        {/* Sub Info */}
        <View style={styles.subInfoRow}>
          <Ionicons name="person-outline" size={14} color={immoColors.textMuted} />
          <Text style={styles.subInfoText}>{display.userName}</Text>
        </View>

        {/* Price */}
        <Text style={styles.price}>{display.priceFormatted}</Text>

        {/* Actions: 查看詳情 + 聯絡委託人 */}
        <ImmoCardActions
          primaryLabel="聯絡委託人"
          primaryIcon="chatbubble-outline"
          primaryColor={immoColors.wishPrimary}
          onPrimaryPress={onMessagePress}
          primaryLoading={isLoading}
          showSecondary={true}
          secondaryLabel="查看詳情"
          onSecondaryPress={onPress}
          secondaryStyle="outline"
          secondaryColor={immoColors.secondary}
          layout="row"
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// Skeleton Loader
// ============================================
export function ImmoScoutWishCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.imageContainer, styles.skeletonImage]} />
      <View style={styles.content}>
        <View style={[styles.skeletonLine, { width: '80%', height: 16 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 14, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 18, marginTop: 12 }]} />
        <View style={[styles.skeletonLine, { width: '100%', height: 40, marginTop: 12, borderRadius: immoRadius.lg }]} />
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
    borderRadius: immoRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: immoColors.borderLight,
    ...immoShadows.card,
  },
  // Image Area - 固定比例容器，不影響其他區塊
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3, // 固定 4:3 比例，鎖定圖片區高度
    position: 'relative',
    overflow: 'hidden', // 確保圓角和裁切
  },
  countryBadge: {
    position: 'absolute',
    top: immoSpacing.sm,
    left: immoSpacing.sm,
    zIndex: 10,
  },
  statusBadge: {
    position: 'absolute',
    bottom: immoSpacing.sm,
    left: immoSpacing.sm,
    backgroundColor: immoColors.accent,
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs,
    borderRadius: immoRadius.sm,
    zIndex: 10,
  },
  statusText: {
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.white,
  },
  // Content Area
  content: {
    padding: immoSpacing.md,
  },
  title: {
    fontSize: immoTypography.fontSize.md,
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.textPrimary,
    lineHeight: 22,
    marginBottom: immoSpacing.xs,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: immoSpacing.xs,
    marginBottom: immoSpacing.sm,
  },
  subInfoText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
  },
  price: {
    fontSize: immoTypography.fontSize.lg,
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.priceHighlight,
    marginBottom: immoSpacing.md,
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

export default ImmoScoutWishCard;
