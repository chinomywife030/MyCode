/**
 * Discovery 詳情頁
 * 顯示旅途發現的詳細信息，並提供轉換為 Wish 的功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { getDiscoveryById, type Discovery } from '@/src/lib/discoveries';
import { getCurrentUser } from '@/src/lib/auth';
import { Screen } from '@/src/ui/Screen';
import { Card } from '@/src/ui/Card';
import { WishHeroCarousel } from '@/src/components/WishHeroCarousel';
import { CountryChip } from '@/src/components/CountryChip';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

export default function DiscoveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchDiscovery();
      loadCurrentUser();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchDiscovery();
      }
    }, [id])
  );

  const loadCurrentUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const fetchDiscovery = async () => {
    if (!id) {
      setLoading(false);
      setError('缺少 ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getDiscoveryById(id as string);
      if (data) {
        setDiscovery(data);
      } else {
        setError('找不到該旅途發現');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗';
      setError(errorMessage);
      console.error('[DiscoveryDetailScreen] fetchDiscovery error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchDiscovery();
  };

  // 轉換為 Wish（跳轉到 Create Wish 頁面並預填充）
  const handleConvertToWish = () => {
    if (!discovery) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 構建預填充參數
    const params: Record<string, string> = {};
    if (discovery.title) {
      params.prefill_title = discovery.title;
    }
    if (discovery.country) {
      params.prefill_country = discovery.country;
    }
    if (discovery.city) {
      params.prefill_city = discovery.city;
    }
    if (discovery.photos?.[0]) {
      params.prefill_image = discovery.photos[0];
    }

    // 跳轉到 Create Wish 頁面
    router.push({
      pathname: '/create',
      params,
    });
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !discovery) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || '找不到該旅途發現'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>重試</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const authorName = discovery.profiles?.name || '匿名用戶';
  const authorAvatar = discovery.profiles?.avatar_url;
  const locationText = [discovery.city, discovery.country]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>旅途發現</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero 圖片輪播 */}
        <WishHeroCarousel images={discovery.photos || []} />

        {/* 標題卡片 */}
        <Card style={styles.titleCard}>
          <Text style={styles.title}>{discovery.title}</Text>
          {discovery.country && (
            <View style={styles.tagContainer}>
              <CountryChip countryCode={discovery.country} />
            </View>
          )}
        </Card>

        {/* 作者與位置資訊 */}
        <Card style={styles.sectionCard}>
          <View style={styles.authorRow}>
            {authorAvatar ? (
              <Image
                source={{ uri: authorAvatar }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorAvatarText}>
                  {authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{authorName}</Text>
              {locationText && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={styles.locationText}>{locationText}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* 描述區塊 */}
        {discovery.description && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>描述</Text>
            <Text style={styles.descriptionText}>{discovery.description}</Text>
          </Card>
        )}
      </ScrollView>

      {/* 底部 CTA 按鈕 */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={styles.convertButton}
          onPress={handleConvertToWish}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={20} color="#FFFFFF" />
          <Text style={styles.convertButtonText}>我想要</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // 為底部按鈕留出空間
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandOrange,
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  titleCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
  },
  authorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    ...shadows.sm,
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandOrange,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  convertButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
});


