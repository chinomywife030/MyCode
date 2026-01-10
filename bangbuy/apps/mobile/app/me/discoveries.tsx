import { StyleSheet, View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, StateView } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight, radius, shadows } from '@/src/theme/tokens';
import { getCurrentUser } from '@/src/lib/auth';
import { getMyDiscoveries, deleteDiscovery, type Discovery } from '@/src/lib/discoveries';
import { ImmoScoutDiscoveryCard, normalizeDiscoveryForCard } from '@/src/components/ImmoScoutDiscoveryCard';

export default function MyDiscoveriesScreen() {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showMoreMenuId, setShowMoreMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadDiscoveries();
    }
  }, [user]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (!currentUser) {
      router.replace('/login');
    }
  };

  const loadDiscoveries = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getMyDiscoveries();
      setDiscoveries(data);
    } catch (error) {
      console.error('[MyDiscoveriesScreen] Exception:', error);
      setDiscoveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDiscoveries(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      '確認刪除？',
      '刪除後無法復原',
      [
        {
          text: '取消',
          style: 'cancel',
          onPress: () => setShowMoreMenuId(null),
        },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              setShowMoreMenuId(null);

              const result = await deleteDiscovery(id);

              if (!result.success) {
                Alert.alert('刪除失敗', result.error || '請稍後再試');
                setDeletingId(null);
                return;
              }

              // Optimistic update：立即從列表中移除
              setDiscoveries((prev) => prev.filter((item) => item.id !== id));
              setDeletingId(null);

              // 顯示成功提示
              Alert.alert('刪除成功', '旅途發現已刪除');
            } catch (err) {
              console.error('[MyDiscoveriesScreen] Delete error:', err);
              Alert.alert('錯誤', '刪除失敗，請稍後再試');
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Discovery }) => {
    const displayData = normalizeDiscoveryForCard(item);
    const isDeleting = deletingId === item.id;
    const showMenu = showMoreMenuId === item.id;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.cardWrapper}>
          <ImmoScoutDiscoveryCard
            display={displayData}
            onPress={() => {
              if (!showMenu) {
                router.push(`/discovery/${item.id}`);
              }
            }}
            onInterestPress={() => {
              // 處理「私訊」按鈕（如果需要）
            }}
            currentUserId={user?.id}
          />
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={(e) => {
            e.stopPropagation();
            setShowMoreMenuId(showMenu ? null : item.id);
          }}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </TouchableOpacity>
        {showMenu && (
          <View style={styles.moreMenu}>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => handleDelete(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.moreMenuTextDanger}>刪除</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => setShowMoreMenuId(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreMenuText}>取消</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && discoveries.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的旅途發現</Text>
          <View style={styles.backButton} />
        </View>
        <StateView type="loading" message="載入中..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的旅途發現</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={discoveries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={discoveries.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <StateView type="empty" message="目前沒有旅途發現" />
        }
        onScrollBeginDrag={() => {
          // 滾動時關閉選單
          if (showMoreMenuId) {
            setShowMoreMenuId(null);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  itemContainer: {
    position: 'relative',
    marginBottom: spacing.md,
    width: '100%',
  },
  cardWrapper: {
    width: '100%',
  },
  moreButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...shadows.sm,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
  },
  moreMenu: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    minWidth: 120,
    zIndex: 20,
    ...shadows.lg,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  moreMenuText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  moreMenuTextDanger: {
    fontSize: fontSize.base,
    color: colors.error,
  },
});

