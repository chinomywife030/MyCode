import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getTrips, getMoments, formatDateRange, type Trip, type TravelMoment } from '@/src/lib/trips';
import { getCurrentUser } from '@/src/lib/auth';
import { startChat } from '@/src/lib/chat';
import { Screen, TopBar, HeroBanner, SearchRow, TripCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { MomentCard } from '@/src/components/MomentCard';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

// ============================================
// Feed Item Union Type
// ============================================

type FeedItem = 
  | (Trip & { type: 'trip' })
  | (TravelMoment & { type: 'moment' });

/**
 * 行程頁面內容組件
 * 混合 Feed：顯示 Trip Plans 和 Travel Moments
 */
export function TripsPageContent() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [messageLoading, setMessageLoading] = useState<string | null>(null);

  const fetchTrips = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 並行獲取 trips 和 moments
      const [tripsData, momentsData] = await Promise.all([
        getTrips(),
        getMoments(),
      ]);

      // 轉換並添加 type 標記
      const tripsWithType: FeedItem[] = tripsData.map((trip) => ({
        ...trip,
        type: 'trip' as const,
      }));

      const momentsWithType: FeedItem[] = momentsData.map((moment) => ({
        ...moment,
        type: 'moment' as const,
      }));

      // 合併並按 created_at 降序排序（最新的在前）
      const merged = [...tripsWithType, ...momentsWithType].sort((a, b) => {
        const aTime = a.type === 'trip' 
          ? (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          : new Date(a.created_at).getTime();
        const bTime = b.type === 'trip'
          ? (b.createdAt ? new Date(b.createdAt).getTime() : 0)
          : new Date(b.created_at).getTime();
        return bTime - aTime; // 降序
      });

      setFeedItems(merged);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[TripsPageContent] fetchTrips error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    loadCurrentUser();
  }, []);

  // 當頁面獲得焦點時，刷新列表（從 Create Trip 返回時）
  useFocusEffect(
    useCallback(() => {
      // 如果已經有 user，刷新列表以確保顯示最新資料
      if (user?.id) {
        fetchTrips(true);
      }
    }, [user?.id])
  );

  const loadCurrentUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleRefresh = () => {
    fetchTrips(true);
  };

  const handleRetry = () => {
    fetchTrips();
  };

  const handleTripPress = (tripId: string) => {
    router.push(`/trip/${tripId}` as any);
  };

  const handleMessagePress = async (trip: Trip) => {
    if (messageLoading) return; // 防止重複點擊

    try {
      setMessageLoading(trip.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await startChat(
        trip.shopperId,
        'trip',
        trip.id,
        trip.destination
      );

      if (!result.success) {
        Alert.alert('錯誤', result.error || '無法開啟對話');
      }
      // 成功時 startChat 會自動導航
    } catch (error: any) {
      console.error('[TripsPageContent] handleMessagePress error:', error);
      Alert.alert('錯誤', error.message || '開啟對話失敗');
    } finally {
      setMessageLoading(null);
    }
  };

  // 過濾 Feed Items（根據搜尋關鍵字和篩選條件）
  const filteredItems = feedItems.filter((item) => {
    // 搜尋關鍵字過濾
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      
      if (item.type === 'trip') {
        const matchesSearch =
          item.destination.toLowerCase().includes(lowerQuery) ||
          (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
          (item.owner?.name && item.owner.name.toLowerCase().includes(lowerQuery));
        if (!matchesSearch) {
          return false;
        }
      } else if (item.type === 'moment') {
        const matchesSearch =
          (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
          (item.location && item.location.toLowerCase().includes(lowerQuery)) ||
          (item.profiles?.name && item.profiles.name.toLowerCase().includes(lowerQuery));
        if (!matchesSearch) {
          return false;
        }
      }
    }

    // 國家篩選（如果 trip 有 destination 國家資訊）
    // 注意：目前 Trip 類型可能沒有 country 欄位，這裡先做 placeholder
    // if (filters.country && item.type === 'trip' && item.country !== filters.country) {
    //   return false;
    // }

    return true;
  });

  const handleFilterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterModalVisible(true);
  };

  const handleFilterApply = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // 重新載入資料（如果需要後端篩選，可以在這裡調用 API）
    fetchTrips(true);
  };

  const handleFilterClear = () => {
    setFilters({});
    fetchTrips(true);
  };

  const handleBellPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user) {
      router.push('/(tabs)/profile');
    } else {
      router.push('/login');
    }
  };

  const handleMomentChatPress = async (moment: TravelMoment) => {
    if (messageLoading) return;

    try {
      setMessageLoading(moment.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log('Navigate to chat', { momentId: moment.id, userId: moment.user_id });

      // 使用 startChat 開啟對話
      const result = await startChat(
        moment.user_id,
        'direct', // 直接對話
        undefined,
        moment.description || '旅行時刻'
      );

      if (!result.success) {
        Alert.alert('錯誤', result.error || '無法開啟對話');
      }
    } catch (error: any) {
      console.error('[TripsPageContent] handleMomentChatPress error:', error);
      Alert.alert('錯誤', error.message || '開啟對話失敗');
    } finally {
      setMessageLoading(null);
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'trip') {
      return (
        <TripCard
          id={item.id}
          destination={item.destination}
          description={item.description}
          dateRange={formatDateRange(item.startDate, item.endDate)}
          ownerName={item.owner?.name}
          ownerAvatar={item.owner?.avatarUrl}
          onPress={() => handleTripPress(item.id)}
          onMessagePress={() => handleMessagePress(item)}
        />
      );
    } else {
      // item.type === 'moment'
      return (
        <MomentCard
          id={item.id}
          description={item.description}
          images={item.images}
          location={item.location}
          createdAt={item.created_at}
          user={item.profiles ? {
            id: item.profiles.id,
            name: item.profiles.name,
            avatarUrl: item.profiles.avatar_url,
          } : undefined}
          onChatPress={() => handleMomentChatPress(item)}
        />
      );
    }
  };

  const renderEmpty = () => {
    if (loading) {
      return <StateView type="loading" message="載入中..." />;
    }
    if (error) {
      return <StateView type="error" message={error} onRetry={handleRetry} />;
    }
    return <StateView type="empty" message="目前沒有內容" />;
  };

  const renderHeader = () => (
    <>
      <HeroBanner
        title="開始接單賺錢"
        subtitle="發布你的行程，讓需要的人直接私訊你"
        buttonText="發布行程"
        onButtonPress={() => router.push('/trip/create')}
        variant="blue"
      />

      <SearchRow
        placeholder="搜尋目的地、商品、關鍵字"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={handleFilterPress}
      />

      <Text style={styles.hintText}>行程越清楚（城市/日期/可幫買品類）越容易成交</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>動態 Feed</Text>
        <Text style={styles.sectionSubtitle}>行程計劃與旅行時刻</Text>
      </View>
    </>
  );

  return (
    <Screen>
      <TopBar
        userEmail={user?.email}
        onBellPress={handleBellPress}
        onAvatarPress={handleAvatarPress}
      />
      
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={filteredItems.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        initialFilters={filters}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: 0,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    minHeight: 300,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandBlue,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});

// Default export for expo-router
export default function TripsPageContentWrapper() {
  return <TripsPageContent />;
}

