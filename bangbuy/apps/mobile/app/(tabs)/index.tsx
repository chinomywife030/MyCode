import { StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getNotificationPermission, registerPushToken } from '@/src/lib/push';

export default function HomeScreen() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<{ granted: boolean; token: string | null; error?: string } | null>(null);

  const fetchWishes = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getWishes();
      setWishes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[HomeScreen] fetchWishes error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWishes();
    // 載入 Push 狀態（僅用於顯示，不重複註冊）
    loadPushStatus();
  }, []);

  const loadPushStatus = async () => {
    const status = await getNotificationPermission();
    setPushStatus(status);
  };

  const handleRetryPush = async () => {
    const result = await registerPushToken();
    if (result.success) {
      await loadPushStatus();
    }
  };

  const handleRefresh = () => {
    fetchWishes(true);
  };

  const handleRetry = () => {
    fetchWishes();
  };

  const renderItem = ({ item }: { item: Wish }) => (
    <Link href={`/wish/${item.id}` as any} asChild>
      <TouchableOpacity style={styles.item} activeOpacity={0.7}>
        <ThemedView style={styles.itemContent}>
          <ThemedText type="defaultSemiBold" style={styles.itemId}>
            #{item.id}
          </ThemedText>
          <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
        </ThemedView>
      </TouchableOpacity>
    </Link>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>載入中...</ThemedText>
        </ThemedView>
      );
    }

    if (error) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <ThemedText style={styles.retryButtonText}>重試</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>目前沒有資料</ThemedText>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          BangBuy Mobile (MVP)
        </ThemedText>
        {/* Push 狀態顯示（Debug Only） */}
        {pushStatus && (
          <ThemedView style={styles.pushDebugContainer}>
            <ThemedText style={styles.pushDebugLabel}>
              Push: {pushStatus.granted ? '✅ granted' : '❌ denied'}
            </ThemedText>
            {pushStatus.token && (
              <ThemedText style={styles.pushDebugToken}>
                Token: {pushStatus.token.substring(0, 10)}...
              </ThemedText>
            )}
            {pushStatus.error && (
              <ThemedText style={styles.pushDebugError}>
                {pushStatus.error}
              </ThemedText>
            )}
            {!pushStatus.granted && (
              <TouchableOpacity style={styles.pushRetryButton} onPress={handleRetryPush}>
                <ThemedText style={styles.pushRetryButtonText}>重試註冊</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        )}
      </ThemedView>
      <FlatList
        data={wishes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={wishes.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  item: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemContent: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemId: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
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
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pushDebugContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  pushDebugLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  pushDebugToken: {
    fontSize: 11,
    opacity: 0.6,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  pushDebugError: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 4,
  },
  pushRetryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pushRetryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
