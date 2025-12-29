import { StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, Link, useFocusEffect, router as expoRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getWishById, type Wish } from '@/src/lib/wishes';
import { getLatestWishReply, type WishReply } from '@/src/lib/replies';

/**
 * 安全地開啟 URL
 */
function openUrl(url: string) {
  let finalUrl = url.trim();
  
  // 如果沒有 http/https 前綴，自動補 https://
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = `https://${finalUrl}`;
  }
  
  // 基本 URL 驗證
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
        // 載入 wish 後，同時載入最新回復
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
    fetchWish();
  }, [id]);

  // 當頁面獲得焦點時（例如從回復頁返回），刷新最新回復
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

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedText style={styles.loadingText}>載入中...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Wish Detail
          </ThemedText>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <ThemedText style={styles.retryButtonText}>重試</ThemedText>
          </TouchableOpacity>
          <Link href="/" style={styles.link}>
            <ThemedText type="link">返回首頁</ThemedText>
          </Link>
        </ThemedView>
      </ThemedView>
    );
  }

  if (notFound || !wish) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Wish Detail
          </ThemedText>
          <ThemedText style={styles.notFound}>找不到這個願望單</ThemedText>
          <Link href="/" style={styles.link}>
            <ThemedText type="link">返回首頁</ThemedText>
          </Link>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {wish.title}
        </ThemedText>

        {/* 分隔線 */}
        <ThemedView style={styles.divider} />

        {/* 描述區塊 */}
        {wish.description && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              描述
            </ThemedText>
            <ThemedView style={styles.sectionContent}>
              <ThemedText style={styles.descriptionText}>{wish.description}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.divider} />
          </>
        )}

        {/* 連結區塊 */}
        {wish.productUrl && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              連結
            </ThemedText>
            <ThemedView style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => openUrl(wish.productUrl!)}
                activeOpacity={0.7}
              >
                <ThemedText type="link" style={styles.linkText}>
                  {wish.productUrl}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.divider} />
          </>
        )}

        {/* 其他資訊區塊 */}
        {(wish.budget || wish.targetCountry || wish.category || wish.deadline) && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              其他資訊
            </ThemedText>
            <ThemedView style={styles.sectionContent}>
              {wish.budget && (
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>預算：</ThemedText>
                  <ThemedText style={styles.infoValue}>NT$ {wish.budget}</ThemedText>
                </ThemedView>
              )}
              {wish.targetCountry && (
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>目標國家：</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {wish.targetCountry === 'JP' ? '🇯🇵 日本' : wish.targetCountry}
                  </ThemedText>
                </ThemedView>
              )}
              {wish.category && (
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>分類：</ThemedText>
                  <ThemedText style={styles.infoValue}>{wish.category}</ThemedText>
                </ThemedView>
              )}
              {wish.deadline && (
                <ThemedView style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>截止日期：</ThemedText>
                  <ThemedText style={styles.infoValue}>{wish.deadline}</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            <ThemedView style={styles.divider} />
          </>
        )}

        {/* 我要回覆/報價按鈕 */}
        <ThemedView style={styles.divider} />
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => {
            expoRouter.push(`/wish/${id}/reply` as any);
          }}
        >
          <ThemedText style={styles.replyButtonText}>我要回覆/報價</ThemedText>
        </TouchableOpacity>

        {/* 最新回復區塊 */}
        {latestReply && (
          <>
            <ThemedView style={styles.divider} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              最新回覆
            </ThemedText>
            <ThemedView style={styles.replyCard}>
              <ThemedText style={styles.replyMessage}>{latestReply.message}</ThemedText>
              <ThemedText style={styles.replyDate}>
                {formatDate(latestReply.created_at)}
              </ThemedText>
            </ThemedView>
          </>
        )}

        {/* 返回首頁連結 */}
        <Link href="/" style={styles.link}>
          <ThemedText type="link">返回首頁</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
    opacity: 0.8,
  },
  sectionContent: {
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#2563eb',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    opacity: 0.9,
    flex: 1,
  },
  notFound: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 24,
  },
  link: {
    marginTop: 20,
    marginBottom: 40,
  },
  replyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  replyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  replyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 8,
  },
  replyMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    opacity: 0.9,
  },
  replyDate: {
    fontSize: 12,
    opacity: 0.5,
  },
});
