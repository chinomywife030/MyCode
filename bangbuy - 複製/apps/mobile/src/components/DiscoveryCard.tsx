/**
 * Discovery Card 組件
 * 用於在列表中顯示旅途發現（2 欄 Grid 布局）
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { CountryChip } from '@/src/components/CountryChip';
import type { Discovery } from '@/src/lib/discoveries';

interface DiscoveryCardProps {
  discovery: Discovery;
  onPress: () => void;
}

export function DiscoveryCard({ discovery, onPress }: DiscoveryCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const coverImage = discovery.photos?.[0];

  const handleLikePress = (e: any) => {
    e.stopPropagation?.();
    setIsLiked(!isLiked);
    // TODO: 實現收藏功能
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Area */}
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
            <Ionicons name="image-outline" size={32} color={colors.textLight} />
          </View>
        )}

        {/* Country Flag (Top-Left) */}
        {discovery.country && (
          <View style={styles.countryChipContainer}>
            <CountryChip countryCode={discovery.country} size="sm" />
          </View>
        )}

        {/* Heart Icon (Top-Right) */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={handleLikePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#EF4444' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {discovery.title}
        </Text>

        {/* Price - 暫時使用占位符，因為資料庫可能沒有 price 欄位 */}
        <Text style={styles.price}>
          NT$ 0
        </Text>

        {/* Footer Section */}
        <View style={styles.footer}>
          {/* Left Side - Author info or secondary info */}
          <View style={styles.footerLeft}>
            {discovery.profiles?.name ? (
              <View style={styles.authorInfo}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorInitial}>
                    {discovery.profiles.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.authorName}>{discovery.profiles.name}</Text>
              </View>
            ) : (
              <Text style={styles.secondaryInfo}>
                {discovery.country || '旅途發現'}
              </Text>
            )}
          </View>

          {/* Right Side - Message Button */}
          <TouchableOpacity
            style={styles.messageButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onPress();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={14} color="#007AFF" />
            <Text style={styles.messageButtonText}>私訊詢問</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    // 卡片陰影
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // 1:1 正方形
    backgroundColor: '#F3F4F6',
    position: 'relative',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryChipContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#000000',
    marginBottom: spacing.xs,
    lineHeight: 20,
    minHeight: 40, // 確保兩行標題的高度
  },
  price: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.brandOrange, // 橘色價格
  },
  // Footer Section
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    marginTop: 12,
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  authorName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  secondaryInfo: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // Message Button
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  messageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
});


