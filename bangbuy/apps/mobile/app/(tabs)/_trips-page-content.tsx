import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getTrips, formatDateRange, type Trip } from '@/src/lib/trips';
import { getCurrentUser } from '@/src/lib/auth';
import { startChat } from '@/src/lib/chat';
import { Screen, TopBar, HeroBanner, SearchRow, TripCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

/**
 * 行程頁面內容組件
 * 原本的 TripsScreen 組件
 */
export function TripsPageContent() {
  const [trips, setTrips] = useState<Trip[]>([]);
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
      const data = await getTrips();
      setTrips(data);
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

  // 過濾行程（根據搜尋關鍵字和篩選條件）
  const filteredTrips = trips.filter((trip) => {
    // 搜尋關鍵字過濾
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        trip.destination.toLowerCase().includes(lowerQuery) ||
        (trip.description && trip.description.toLowerCase().includes(lowerQuery)) ||
        (trip.owner?.name && trip.owner.name.toLowerCase().includes(lowerQuery));
      if (!matchesSearch) {
        return false;
      }
    }

    // 國家篩選（如果 trip 有 destination 國家資訊）
    // 注意：目前 Trip 類型可能沒有 country 欄位，這裡先做 placeholder
    // if (filters.country && trip.country !== filters.country) {
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

  const renderItem = ({ item }: { item: Trip }) => (
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

  const renderEmpty = () => {
    if (loading) {
      return <StateView type="loading" message="載入行程中..." />;
    }
    if (error) {
      return <StateView type="error" message={error} onRetry={handleRetry} />;
    }
    return <StateView type="empty" message="目前沒有行程" />;
  };

  const renderHeader = () => (
    <>
      <HeroBanner
        title="開始接單賺錢"
        subtitle="發布你的行程，讓需要的人直接私訊你"
        buttonText="發布行程"
        onButtonPress={() => router.push('/create?type=trip')}
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
        <Text style={styles.sectionTitle}>最新行程</Text>
        <Text style={styles.sectionSubtitle}>即將出發的代購行程</Text>
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
        data={filteredTrips}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={filteredTrips.length === 0 ? styles.emptyList : styles.list}
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

