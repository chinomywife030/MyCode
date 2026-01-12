import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { CountryChip } from '@/src/components/CountryChip';

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
  onMessagePress: () => void;
}

/**
 * Request Card - Final Design Spec
 * 
 * Structure (Top to Bottom):
 * A. Image Area (1:1 or 4:3): Country Chip (top-left), Heart Icon (top-right)
 * B. Text Content: Title (2 lines), Sub-info (UserName · Status), Price (Orange)
 * C. CTA Button: Full width, 44-48px height, Orange background, Dynamic text
 */
export function WishCard({ 
  id, 
  title, 
  country, 
  images = [], 
  budget,
  buyer,
  status,
  isSellingProduct = false, // ✅ 默认为 Buying Request (Wish)
  onPress,
  onMessagePress
}: WishCardProps) {

  const handleButtonPress = (e: any) => {
    e.stopPropagation?.();
    onMessagePress();
  };

  // 格式化状态文本
  const statusText = status === 'open' ? '需求中' : status || '需求中';
  const userName = buyer?.name || '使用者';
  const subInfo = `${userName} · ${statusText}`;

  // 格式化价格
  const priceText = budget && budget > 0 
    ? `預估 NT$ ${budget.toLocaleString()}` 
    : '預估 NT$ 0';

  // 第一张图片或占位符
  const firstImage = images?.[0];

  // ========== DEBUG 標記：確認 WishCard 為最外層 ==========
  console.log('[WishCard] Rendering with new UI structure (no wrapper)', { id, title });

  return (
    <View style={styles.card}>
      {/* A. Image Area (Hero) - 1:1 Square */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {firstImage && (firstImage.startsWith('http://') || firstImage.startsWith('https://')) ? (
          <ExpoImage
            source={{ uri: firstImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
            onError={(error) => {
              console.error('[WishCard] Image load error:', {
                id,
                uri: firstImage,
                error: error.nativeEvent?.error || error,
              });
            }}
            onLoad={() => {
              console.log('[WishCard] Image loaded successfully:', {
                id,
                uri: firstImage,
              });
            }}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.textLight} />
          </View>
        )}

        {/* Top-Left: Country Chip */}
        {country && (
          <View style={styles.countryChipContainer}>
            <CountryChip countryCode={country} size="sm" />
          </View>
        )}
      </TouchableOpacity>

      {/* B. Text Content (Padding Area) */}
      <View style={styles.content}>
        {/* Title: Bold, Black, Max 2 lines */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Sub-info: Avatar + UserName + Status */}
        <View style={styles.subInfoRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {buyer?.avatarUrl ? (
              <ExpoImage
                source={{ uri: buyer.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={12} color={colors.textMuted} />
              </View>
            )}
          </View>
          {/* UserName + Status */}
          <Text style={styles.subInfo} numberOfLines={1}>
            {userName} · {statusText}
          </Text>
        </View>

        {/* Price: Distinct Orange color - Format: 預估 NT$ {price} */}
        <Text style={styles.price}>
          {priceText}
        </Text>
      </View>

      {/* C. CTA Button (Bottom Anchor) */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleButtonPress}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaButtonText}>
          {isSellingProduct ? '私訊代購' : '聯絡委託人'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    // ✅ 新 UI 結構：卡片陰影（確保為最外層）
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // A. Image Area
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // 1:1 Square
    position: 'relative',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryChipContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  // B. Text Content
  content: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#000000', // Black
    marginBottom: spacing.xs,
    lineHeight: 20,
    minHeight: 40, // Ensure 2 lines height
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  avatarContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: {
    fontSize: fontSize.xs,
    color: colors.textMuted, // Grey
    flex: 1,
  },
  price: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.brandOrange, // Distinct Orange
  },
  // C. CTA Button
  ctaButton: {
    width: '100%',
    height: 44, // Fixed 44px (Touch target friendly)
    backgroundColor: colors.brandOrange, // Brand Orange (Solid)
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  ctaButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF', // White
  },
});
