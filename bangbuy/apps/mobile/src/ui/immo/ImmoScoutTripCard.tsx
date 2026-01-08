/**
 * ImmoScout 風格 TripCard
 * 設計參考 Immobilienscout24 的物件列表卡片風格
 * 
 * 結構：
 * - 卡片式設計：左側頭像/資訊 + 右側行程詳情
 * - 標題 > 日期/地點 > Actions（主 CTA 橘色 + 查看詳情）
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
export interface ImmoTripDisplayModel {
  id: string;
  destination: string;
  description?: string;
  dateRange?: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerInitial: string;
}

/**
 * 將原始 Trip 資料轉換為 Display Model
 * 純 UI 格式化，不改變任何業務邏輯
 */
export function normalizeTripForCard(trip: {
  id: string;
  destination: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  owner?: { name?: string; avatarUrl?: string };
}, dateRange?: string): ImmoTripDisplayModel {
  const ownerName = trip.owner?.name || '匿名用戶';
  
  return {
    id: trip.id,
    destination: trip.destination,
    description: trip.description,
    dateRange: dateRange,
    ownerName,
    ownerAvatar: trip.owner?.avatarUrl,
    ownerInitial: ownerName.charAt(0).toUpperCase(),
  };
}

// ============================================
// Component Props
// ============================================
interface ImmoScoutTripCardProps {
  /** Display model */
  display: ImmoTripDisplayModel;
  /** 點擊卡片（進入詳情頁） */
  onPress: () => void;
  /** 點擊 CTA 按鈕（私訊） */
  onMessagePress: () => void;
  /** 是否正在載入中 */
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================
export function ImmoScoutTripCard({
  display,
  onPress,
  onMessagePress,
  isLoading = false,
}: ImmoScoutTripCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* ============================================ */}
      {/* Header: Avatar + User Info + Date Badge */}
      {/* ============================================ */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {display.ownerAvatar ? (
            <ExpoImage
              source={{ uri: display.ownerAvatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{display.ownerInitial}</Text>
            </View>
          )}
          {/* Online Indicator */}
          <View style={styles.onlineIndicator} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{display.ownerName}</Text>
          <Text style={styles.userRole}>代購夥伴</Text>
        </View>

        {/* Date Badge */}
        {display.dateRange && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={12} color={immoColors.tripPrimary} />
            <Text style={styles.dateText}>{display.dateRange}</Text>
          </View>
        )}
      </View>

      {/* ============================================ */}
      {/* Content: Destination + Description */}
      {/* ============================================ */}
      <View style={styles.content}>
        {/* Destination Title */}
        <View style={styles.destinationRow}>
          <Ionicons name="airplane" size={18} color={immoColors.tripPrimary} />
          <Text style={styles.destination}>前往 {display.destination}</Text>
        </View>

        {/* Description */}
        {display.description && (
          <Text style={styles.description} numberOfLines={2}>
            {display.description}
          </Text>
        )}
      </View>

      {/* ============================================ */}
      {/* Footer: Actions（查看行程 + 私訊） */}
      {/* ============================================ */}
      <View style={styles.footer}>
        <ImmoCardActions
          primaryLabel="私訊"
          primaryIcon="chatbubble-outline"
          primaryColor={immoColors.tripPrimary}
          onPrimaryPress={onMessagePress}
          primaryLoading={isLoading}
          showSecondary={true}
          secondaryLabel="查看行程"
          onSecondaryPress={onPress}
          secondaryStyle="outline"
          secondaryColor={immoColors.tripPrimary}
          layout="row"
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// Skeleton Loader
// ============================================
export function ImmoScoutTripCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatarPlaceholder, styles.skeletonAvatar]} />
        <View style={styles.userInfo}>
          <View style={[styles.skeletonLine, { width: 80, height: 14 }]} />
          <View style={[styles.skeletonLine, { width: 60, height: 12, marginTop: 4 }]} />
        </View>
        <View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: immoRadius.full }]} />
      </View>
      <View style={styles.content}>
        <View style={[styles.skeletonLine, { width: '70%', height: 18 }]} />
        <View style={[styles.skeletonLine, { width: '100%', height: 14, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '80%', height: 14, marginTop: 4 }]} />
      </View>
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', gap: immoSpacing.sm }}>
          <View style={[styles.skeletonLine, { flex: 1, height: 40, borderRadius: immoRadius.lg }]} />
          <View style={[styles.skeletonLine, { flex: 1, height: 40, borderRadius: immoRadius.lg }]} />
        </View>
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: immoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: immoColors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: immoColors.tripPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: immoTypography.fontSize.lg,
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.white,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: immoColors.success,
    borderWidth: 2,
    borderColor: immoColors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: immoSpacing.md,
  },
  userName: {
    fontSize: immoTypography.fontSize.md,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.textPrimary,
  },
  userRole: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: immoSpacing.xs,
    backgroundColor: immoColors.tripPrimaryLight,
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs,
    borderRadius: immoRadius.full,
  },
  dateText: {
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.medium,
    color: immoColors.tripPrimary,
  },
  // Content
  content: {
    padding: immoSpacing.md,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: immoSpacing.sm,
    marginBottom: immoSpacing.sm,
  },
  destination: {
    fontSize: immoTypography.fontSize.lg,
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.textPrimary,
  },
  description: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textSecondary,
    lineHeight: 20,
  },
  // Footer
  footer: {
    padding: immoSpacing.md,
    paddingTop: 0,
  },
  // Skeleton
  skeletonAvatar: {
    backgroundColor: immoColors.background,
  },
  skeletonLine: {
    backgroundColor: immoColors.background,
    borderRadius: immoRadius.sm,
  },
});

export default ImmoScoutTripCard;
