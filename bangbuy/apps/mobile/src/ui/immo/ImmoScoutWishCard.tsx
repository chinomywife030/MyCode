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
import { ImmoImageCarousel } from './ImmoImageCarousel';
import { ImmoCardActions } from './ImmoCardActions';
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
export interface ImmoWishDisplayModel {
  id: string;
  title: string;
  country?: string;
  /** 單張圖片（向後兼容） */
  image?: string;
  /** 多張圖片（用於輪播） */
  images?: string[];
  price: number;
  priceFormatted: string;
  userName: string;
  status: string;
  statusText: string;
}

/**
 * 將原始 Wish 資料轉換為 Display Model
 * 純 UI 格式化，不改變任何業務邏輯
 */
export function normalizeWishForCard(wish: {
  id: string;
  title: string;
  targetCountry?: string;
  images?: string[];
  budget?: number;
  price?: number;
  commission?: number;
  buyer?: { name?: string; avatarUrl?: string };
  status?: string;
}): ImmoWishDisplayModel {
  // 計算顯示價格（沿用原邏輯）
  let displayPrice = 0;
  if (wish.budget && wish.budget > 0) {
    displayPrice = wish.budget;
  } else if (wish.price && wish.commission) {
    displayPrice = wish.price + wish.commission;
  } else if (wish.price) {
    displayPrice = wish.price;
  }

  return {
    id: wish.id,
    title: wish.title,
    country: wish.targetCountry,
    image: wish.images?.[0],
    images: wish.images || [],
    price: displayPrice,
    priceFormatted: displayPrice > 0 
      ? `NT$ ${displayPrice.toLocaleString()}`
      : '價格洽詢',
    userName: wish.buyer?.name || '使用者',
    status: wish.status || 'open',
    statusText: wish.status === 'open' ? '需求中' : wish.status || '需求中',
  };
}

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
  const [isLiked, setIsLiked] = useState(false);

  const handleLikePress = () => {
    setIsLiked(!isLiked);
    // TODO: 實現收藏功能
  };

  // 取得圖片陣列（優先使用 images，fallback 到 image）
  const imageList = display.images && display.images.length > 0 
    ? display.images 
    : display.image 
      ? [display.image] 
      : [];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* ============================================ */}
      {/* Image Carousel Area */}
      {/* ============================================ */}
      <View style={styles.imageContainer}>
        <ImmoImageCarousel
          images={imageList}
          aspectRatio={4 / 3}
          showIndicator={imageList.length > 1}
          indicatorType="dots"
        />

        {/* Country Chip (Top-Left) */}
        {display.country && (
          <View style={styles.countryBadge}>
            <CountryChip countryCode={display.country} size="sm" />
          </View>
        )}

        {/* Heart Button (Top-Right) */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleLikePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? immoColors.heartActive : immoColors.heartInactive}
          />
        </TouchableOpacity>

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
  // Image Area
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  countryBadge: {
    position: 'absolute',
    top: immoSpacing.sm,
    left: immoSpacing.sm,
    zIndex: 10,
  },
  heartButton: {
    position: 'absolute',
    top: immoSpacing.sm,
    right: immoSpacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
