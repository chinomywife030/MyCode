import { StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Text, View } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, Link, useFocusEffect, router as expoRouter } from 'expo-router';
import { getWishById, type Wish } from '@/src/lib/wishes';
import { getLatestWishReply, type WishReply } from '@/src/lib/replies';
import { getCurrentUser } from '@/src/lib/auth';
import { navigateToRoute } from '@/src/lib/navigation';
import { Screen } from '@/src/ui/Screen';
import { TopBar } from '@/src/ui/TopBar';
import { Card } from '@/src/ui/Card';
import { Tag } from '@/src/ui/Tag';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { WishHeroCarousel } from '@/src/components/WishHeroCarousel';

/**
 * 安全地開啟 URL
 */
function openUrl(url: string) {
  let finalUrl = url.trim();
  
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = `https://${finalUrl}`;
  }
  
  try {
    new URL(finalUrl);
    Linking.openURL(finalUrl).catch(() => {
      Alert.alert('錯誤', '無法開啟連結');
    });
  } catch {
    Alert.alert('錯誤', '無效的連結格式');
  }
}

export default function WishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wish, setWish] = useState<Wish | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [latestReply, setLatestReply] = useState<WishReply | undefined>(undefined);
  const [replyLoading, setReplyLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setCheckingAuth(false);
      } catch (error) {
        console.error('[WishDetailScreen] Auth check error:', error);
        setCheckingAuth(false);
      }
    };

    if (id) {
      checkAuth();
    } else {
      setCheckingAuth(false);
      setNotFound(true);
    }
  }, [id]);

  const fetchWish = async () => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const data = await getWishById(id);
      if (data === undefined) {
        setNotFound(true);
      } else {
        setWish(data);
        fetchLatestReply();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[WishDetailScreen] fetchWish error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestReply = async () => {
    if (!id) return;
    
    try {
      setReplyLoading(true);
      const reply = await getLatestWishReply(id as string);
      setLatestReply(reply);
    } catch (err) {
      console.error('[WishDetailScreen] fetchLatestReply error:', err);
    } finally {
      setReplyLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth && id) {
      fetchWish();
    }
  }, [id, checkingAuth]);

  useFocusEffect(
    useCallback(() => {
      if (id && wish) {
        fetchLatestReply();
      }
    }, [id, wish])
  );

  const handleRetry = () => {
    fetchWish();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (checkingAuth || loading) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Wish Detail</Text>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>重試</Text>
          </TouchableOpacity>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>返回首頁</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  if (notFound || !wish) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Wish Detail</Text>
          <Text style={styles.notFound}>找不到這個願望單</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>返回首頁</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero 圖片輪播 */}
        <WishHeroCarousel images={wish.images || []} />

        {/* 標題卡片 */}
        <Card style={styles.titleCard}>
          <Text style={styles.title}>{wish.title}</Text>
          {wish.targetCountry && (
            <View style={styles.tagContainer}>
              <Tag label={wish.targetCountry === 'JP' ? '🇯🇵 日本' : wish.targetCountry} />
            </View>
          )}
        </Card>

        {/* 描述區塊 */}
        {wish.description && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>描述</Text>
            <Text style={styles.descriptionText}>{wish.description}</Text>
          </Card>
        )}

        {/* 連結區塊 */}
        {wish.productUrl && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>連結</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openUrl(wish.productUrl!)}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>{wish.productUrl}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* 其他資訊區塊 */}
        {(wish.budget || wish.targetCountry || wish.category || wish.deadline) && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>其他資訊</Text>
            <View style={styles.infoContainer}>
              {wish.budget && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>預算：</Text>
                  <Text style={styles.infoValue}>NT$ {wish.budget}</Text>
                </View>
              )}
              {wish.targetCountry && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>目標國家：</Text>
                  <Text style={styles.infoValue}>
                    {wish.targetCountry === 'JP' ? '🇯🇵 日本' : wish.targetCountry}
                  </Text>
                </View>
              )}
              {wish.category && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>分類：</Text>
                  <Text style={styles.infoValue}>{wish.category}</Text>
                </View>
              )}
              {wish.deadline && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>截止日期：</Text>
                  <Text style={styles.infoValue}>{wish.deadline}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* 我要回覆/報價按鈕 */}
        <TouchableOpacity
          style={styles.replyButton}
          onPress={async () => {
            const user = await getCurrentUser();
            if (!user) {
              const currentRoute = `/wish/${id}/reply`;
              navigateToRoute(currentRoute, true);
            } else {
              expoRouter.push(`/wish/${id}/reply` as any);
            }
          }}
        >
          <Text style={styles.replyButtonText}>我要回覆/報價</Text>
        </TouchableOpacity>

        {/* 最新回復區塊 */}
        {latestReply && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>最新回覆</Text>
            <View style={styles.replyCard}>
              <Text style={styles.replyMessage}>{latestReply.message}</Text>
              <Text style={styles.replyDate}>{formatDate(latestReply.created_at)}</Text>
            </View>
          </Card>
        )}

        {/* 返回首頁連結 */}
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>返回首頁</Text>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  notFound: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    fontSize: fontSize.base,
    color: colors.brandOrange,
    textDecorationLine: 'underline',
  },
  titleCard: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tagContainer: {
    alignSelf: 'flex-start',
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
  },
  linkButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
  },
  infoContainer: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginRight: spacing.md,
    minWidth: 80,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.text,
    flex: 1,
  },
  replyButton: {
    backgroundColor: colors.brandOrange,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  replyButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  replyCard: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyMessage: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  replyDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
