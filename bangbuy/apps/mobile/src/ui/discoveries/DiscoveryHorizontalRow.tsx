/**
 * Discovery 水平滾動行組件
 * 永遠只顯示一排，可左右滑動的水平 carousel
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ImmoScoutDiscoveryCard,
  normalizeDiscoveryForCard,
  type ImmoDiscoveryDisplayModel,
} from '@/src/ui/immo/ImmoScoutDiscoveryCard';
import type { Discovery } from '@/src/lib/discoveries';
import {
  immoColors,
  immoSpacing,
  immoRadius,
  immoTypography,
} from '@/src/ui/immo/theme';

// ============================================
// Constants
// ============================================
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.84; // 卡片寬度為螢幕的 84%（讓右側自然露出下一張一小部分）
const CARD_GAP = immoSpacing.md; // 卡片間距
const CARD_TOTAL_WIDTH = CARD_WIDTH + CARD_GAP; // 卡片總寬度（含間距）
const HORIZONTAL_PADDING = immoSpacing.lg; // 左右 padding

// ============================================
// Props
// ============================================
interface DiscoveryHorizontalRowProps {
  /** Discovery 資料陣列 */
  discoveries: Discovery[];
  /** 點擊卡片（進入詳情頁） */
  onDiscoveryPress?: (discoveryId: string) => void;
  /** 「私訊」按鈕點擊事件（直接跳私訊作者） */
  onInterestPress?: (discovery: Discovery) => void;
  /** 當前用戶 ID（用於判斷是否為自己發布的） */
  currentUserId?: string;
  /** 是否顯示標題列 */
  showHeader?: boolean;
  /** 標題文字 */
  title?: string;
  /** 副標題文字 */
  subtitle?: string;
  /** 是否顯示「查看全部」按鈕 */
  showViewAll?: boolean;
  /** 「查看全部」按鈕點擊事件（預設導航到 discoveries list，如不存在則不顯示） */
  onViewAllPress?: () => void;
}

// ============================================
// Component
// ============================================
export function DiscoveryHorizontalRow({
  discoveries,
  onDiscoveryPress,
  onInterestPress,
  currentUserId,
  showHeader = true,
  title = '旅途發現',
  subtitle = '看看大家發現了什麼',
  showViewAll = false,
  onViewAllPress,
}: DiscoveryHorizontalRowProps) {
  // 如果沒有資料，不渲染
  if (!discoveries || discoveries.length === 0) {
    return null;
  }

  const handleDiscoveryPress = (discoveryId: string) => {
    if (onDiscoveryPress) {
      onDiscoveryPress(discoveryId);
    } else {
      // 預設導航到詳情頁
      router.push(`/discovery/${discoveryId}`);
    }
  };

  const handleViewAllPress = () => {
    if (onViewAllPress) {
      onViewAllPress();
    }
    // 如果沒有提供 onViewAllPress，且沒有 discoveries list 頁面，則不執行任何操作
    // TODO: 未來如果有 discoveries list 頁面，可以在這裡導航
  };

  const renderItem = ({ item }: { item: Discovery }) => {
    const display = normalizeDiscoveryForCard(item);
    
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardWrapper}>
          <ImmoScoutDiscoveryCard
            display={display}
            onPress={() => handleDiscoveryPress(item.id)}
            onInterestPress={() => {
              if (onInterestPress) {
                onInterestPress(item);
              }
            }}
            showInterestButton={true}
            currentUserId={currentUserId}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {showViewAll && onViewAllPress && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllPress}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>查看全部</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={immoColors.wishPrimary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Horizontal FlatList */}
      <View style={styles.listContainer}>
        <FlatList
          data={discoveries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_TOTAL_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          // 確保永遠只有一排，不允許變成 grid
          numColumns={1}
          // 禁用垂直滾動
          scrollEnabled={true}
          // 優化性能
          removeClippedSubviews={true}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      </View>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    marginBottom: immoSpacing.xl,
  },
  listContainer: {
    // 確保 FlatList 容器有明確高度，避免被吃掉
    height: 240,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: immoSpacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: immoTypography.fontSize.xl,
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.textPrimary,
    marginBottom: immoSpacing.xs,
  },
  subtitle: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
    fontWeight: immoTypography.fontWeight.normal,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: immoSpacing.xs,
    paddingVertical: immoSpacing.xs,
    paddingHorizontal: immoSpacing.sm,
  },
  viewAllText: {
    fontSize: immoTypography.fontSize.sm,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.wishPrimary,
  },
  listContent: {
    paddingLeft: HORIZONTAL_PADDING,
    // 確保最後一張卡片右側有足夠的 padding
    paddingRight: HORIZONTAL_PADDING * 2,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    // 確保卡片高度固定，不會變成 grid
    alignItems: 'flex-start',
  },
  cardWrapper: {
    width: '100%',
    // 確保卡片不會超出容器寬度
    maxWidth: CARD_WIDTH,
  },
});

export default DiscoveryHorizontalRow;

