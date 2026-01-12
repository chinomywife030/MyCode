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
  ImageBackground,
} from 'react-native';
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
  // 取得圖片（優先使用 images，fallback 到 image）
  const imageList = display.images && display.images.length > 0 
    ? display.images 
    : display.image 
      ? [display.image] 
      : [];
  
  const coverImage = imageList[0] || null;
  
  // 判斷是否為自己發布的
  const isOwnDiscovery = currentUserId && display.authorId && currentUserId === display.authorId;

  return (
    <View style={styles.cardContainer}>
      {/* 上半部：封面圖 (4:3) + 疊字 */}
      <View style={styles.imageWrapper}>
        {coverImage ? (
          <ImageBackground
            source={{ uri: coverImage }}
            style={styles.imageRatio}
            imageStyle={styles.imageRadius}
          >
            {/* 文字 Overlay */}
            <View style={styles.textOverlay}>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>
                  旅途發現 · {display.country || '未知地點'}
                </Text>
              </View>
              <Text style={styles.titleText} numberOfLines={1}>
                {display.title}
              </Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.imageRatio, styles.imagePlaceholder]}>
            <View style={styles.textOverlay}>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>
                  旅途發現 · {display.country || '未知地點'}
                </Text>
              </View>
              <Text style={styles.titleText} numberOfLines={1}>
                {display.title}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 下半部：資訊列 */}
      <View style={styles.infoContainer}>
        {/* 發現者與地點 */}
        <View style={styles.metaRow}>
          <Text style={styles.finderText}>
            @{display.authorName || 'Finder'}
          </Text>
        </View>

        {/* 灰色提示文案 */}
        <Text style={styles.hintText}>
          對這個有興趣？可私訊詢問代購可能性
        </Text>

        {/* 最底部：主要 CTA (滿寬) */}
        {showInterestButton && (
          <TouchableOpacity
            style={[
              styles.ctaButton,
              isOwnDiscovery && styles.ctaButtonDisabled,
            ]}
            onPress={isOwnDiscovery ? undefined : (onInterestPress || onPress)}
            disabled={isOwnDiscovery}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
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
    <View style={styles.cardContainer}>
      <View style={[styles.imageWrapper, styles.skeletonImage]} />
      <View style={styles.infoContainer}>
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
  cardContainer: {
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: immoColors.borderLight,
    ...immoShadows.card,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 3, // 規格 A: 固定 4:3
    backgroundColor: immoColors.background,
  },
  imageRatio: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // 讓字對齊下方
  },
  imageRadius: {
    borderTopLeftRadius: immoRadius.lg,
    borderTopRightRadius: immoRadius.lg,
  },
  imagePlaceholder: {
    backgroundColor: immoColors.background,
  },
  textOverlay: {
    padding: immoSpacing.md,
    justifyContent: 'flex-end',
    alignItems: 'flex-start', // 左對齊
  },
  tagContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)', // 半透明黑底
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs,
    borderRadius: immoRadius.sm,
    marginBottom: immoSpacing.sm, // 與標題的間距
  },
  tagText: {
    color: immoColors.white,
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.semibold,
  },
  titleText: {
    color: immoColors.white,
    fontSize: immoTypography.fontSize.lg,
    fontWeight: immoTypography.fontWeight.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  infoContainer: {
    padding: immoSpacing.lg, // 規格 C: 統一 Padding
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: immoSpacing.sm,
  },
  finderText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMain,
    fontWeight: immoTypography.fontWeight.semibold,
  },
  hintText: {
    fontSize: immoTypography.fontSize.xs,
    color: immoColors.textMuted, // 規格 B: 灰色小字
    marginBottom: immoSpacing.lg, // 與按鈕的距離
  },
  ctaButton: {
    backgroundColor: immoColors.tripPrimary, // 規格 A: 藍色 (#007AFF)
    width: '100%', // 滿寬
    height: 44, // 規格 A: 高度 44-48
    borderRadius: immoRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: immoColors.borderLight,
    opacity: 0.6,
  },
  ctaButtonText: {
    color: immoColors.white,
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.semibold,
  },
  // Skeleton (保持原有)
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

