import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getTrips, formatDateRange, type Trip } from '@/src/lib/trips';
import { getNotificationPermission, registerPushToken } from '@/src/lib/push';
import { signOut, getCurrentUser } from '@/src/lib/auth';
import { startChat } from '@/src/lib/chat';
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, TripCard, StateView, FilterModal, type FilterOptions, ModeToggle, type Mode } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

/**
 * Home 頁面 - 單頁模式切換
 * 支援「代購（接單）模式」和「買家模式」切換
 */
export default function HomeScreen() {
  console.count('SCREEN_RENDER:index');
  
  // 模式狀態（預設為代購模式，與網站一致）
  const [mode, setMode] = useState<Mode>('shopper');
  
  // 資料狀態
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI 狀態
  const [pushStatus, setPushStatus] = useState<{ granted: boolean; token: string | null; error?: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [messageLoading, setMessageLoading] = useState<string | null>(null);

  // 根據模式獲取當前資料
  const currentData = mode === 'shopper' ? wishes : trips;
  const isLoading = loading && currentData.length === 0;

  // 獲取需求列表
  const fetchWishes = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (wishes.length === 0) {
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

  // 獲取行程列表
  const fetchTrips = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (trips.length === 0) {
        setLoading(true);
      }
      setError(null);
      const data = await getTrips();
      setTrips(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[HomeScreen] fetchTrips error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 根據模式獲取資料
  const fetchData = async (isRefresh = false) => {
    if (mode === 'shopper') {
      await fetchWishes(isRefresh);
    } else {
      await fetchTrips(isRefresh);
    }
  };

  useEffect(() => {
    loadPushStatus();
    loadCurrentUser();
  }, []);

  // 當模式切換時，載入對應資料
  useEffect(() => {
    // 使用 ref 防止重复调用
    let isMounted = true;
    
    if (mode === 'shopper' && wishes.length === 0 && isMounted) {
      fetchWishes();
    } else if (mode === 'buyer' && trips.length === 0 && isMounted) {
      fetchTrips();
    }
    
    return () => {
      isMounted = false;
    };
  }, [mode]); // 只依赖 mode，不依赖 wishes.length 和 trips.length

  const loadCurrentUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      try {
        const { registerPushTokenToSupabase } = await import('@/src/lib/pushService');
        await registerPushTokenToSupabase();
        console.log('[HomeScreen] Push token re-registered for logged-in user');
      } catch (pushError) {
        console.warn('[HomeScreen] Failed to re-register push token:', pushError);
      }
    }
  };

  const loadPushStatus = async () => {
    const status = await getNotificationPermission();
    setPushStatus(status);
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleRetry = () => {
    fetchData();
  };

  // 使用 useCallback 缓存 handler，避免每次 render 都创建新函数
  const handleWishPress = useCallback((wishId: string) => {
    router.push(`/wish/${wishId}` as any);
  }, []);

  const handleTripPress = useCallback((tripId: string) => {
    router.push(`/trip/${tripId}` as any);
  }, []);

  // 使用 useCallback 缓存 handler
  const handleMessagePress = useCallback(async (trip: Trip) => {
    if (messageLoading) return;

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
        // 錯誤處理已在 startChat 中處理
      }
    } catch (error: any) {
      console.error('[HomeScreen] handleMessagePress error:', error);
    } finally {
      setMessageLoading(null);
    }
  }, [messageLoading]);

  // 測試通知 Deep Link
  const handleTestNotification = async () => {
    try {
      // 使用指定的測試對話 ID
      const testChatId = '9c657fb7-f99e-4b16-b617-553cc869b639';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '測試通知',
          body: '點擊此通知測試 Deep Link',
          data: {
            type: 'chat_message',
            chatId: testChatId,
          },
        },
        trigger: null,
      });
      console.log('[HomeScreen] Test notification scheduled with conversationId:', testChatId);
      Alert.alert('測試通知已發送', `使用對話 ID: ${testChatId.substring(0, 8)}...`);
    } catch (error: any) {
      console.error('[HomeScreen] Failed to schedule test notification:', error);
      Alert.alert('錯誤', error.message || '發送測試通知失敗');
    }
  };

  // 使用 useMemo 缓存过滤结果，避免每次 render 都重新计算
  const filteredData = useMemo(() => {
    return currentData.filter((item) => {
      if (!searchQuery.trim()) return true;

      const lowerQuery = searchQuery.toLowerCase();
      
      if (mode === 'shopper') {
        const wish = item as Wish;
        return wish.title.toLowerCase().includes(lowerQuery);
      } else {
        const trip = item as Trip;
        return (
          trip.destination.toLowerCase().includes(lowerQuery) ||
          (trip.description && trip.description.toLowerCase().includes(lowerQuery)) ||
          (trip.owner?.name && trip.owner.name.toLowerCase().includes(lowerQuery))
        );
      }
    });
  }, [currentData, searchQuery, mode]);

  const handleFilterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterModalVisible(true);
  };

  const handleFilterApply = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    fetchData(true);
  };

  const handleFilterClear = () => {
    setFilters({});
    setFilterModalVisible(false);
    fetchData(true);
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

  // 使用 useCallback 缓存 handler
  const handleWishMessagePress = useCallback(async (wish: Wish) => {
    if (messageLoading || !wish.buyerId) return;

    try {
      setMessageLoading(wish.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await startChat(
        wish.buyerId,
        'wish_request',
        wish.id,
        wish.title
      );

      if (!result.success) {
        // 錯誤處理已在 startChat 中處理
      }
    } catch (error: any) {
      console.error('[HomeScreen] handleWishMessagePress error:', error);
    } finally {
      setMessageLoading(null);
    }
  }, [messageLoading]);

  // 使用 useCallback 缓存 renderItem，避免每次 render 都创建新函数
  const renderItem = useCallback(({ item, index }: { item: Wish | Trip; index: number }) => {
    if (mode === 'shopper') {
      const wish = item as Wish;
      
      // 計算顯示價格
      let displayPrice = 0;
      if (wish.budget && wish.budget > 0) {
        // 若 budget 存在且 > 0，視為總價
        displayPrice = wish.budget;
      } else if (wish.price && (wish.commission || (wish as any).service_fee)) {
        // 若 price 與 commission/service_fee 都存在，相加
        const commission = wish.commission || (wish as any).service_fee || 0;
        displayPrice = wish.price + commission;
      } else if (wish.price) {
        // 最後 fallback：只顯示 price
        displayPrice = wish.price;
      }
      
      // 只對第一筆資料 log 價格欄位
      if (index === 0) {
        console.log("FEED_ITEM_0", JSON.stringify(item, null, 2));
        console.log("PRICE_FIELDS", {
          id: wish.id,
          price: wish.price,
          budget: wish.budget,
          commission: wish.commission,
          service_fee: (wish as any).service_fee,
          total: displayPrice
        });
      }
      
      return (
        <WishCard
          id={wish.id}
          title={wish.title}
          country={wish.targetCountry}
          images={wish.images || []}
          budget={displayPrice}
          buyer={wish.buyer}
          status={wish.status}
          onPress={() => handleWishPress(wish.id)}
          onMessagePress={wish.buyerId ? () => handleWishMessagePress(wish) : undefined}
        />
      );
    } else {
      const trip = item as Trip;
      return (
        <TripCard
          id={trip.id}
          destination={trip.destination}
          description={trip.description}
          dateRange={formatDateRange(trip.startDate, trip.endDate)}
          ownerName={trip.owner?.name}
          ownerAvatar={trip.owner?.avatarUrl}
          onPress={() => handleTripPress(trip.id)}
          onMessagePress={() => handleMessagePress(trip)}
        />
      );
    }
  }, [mode, handleWishPress, handleWishMessagePress, handleTripPress, handleMessagePress]);

  // 渲染空狀態
  const renderEmpty = () => {
    if (isLoading) {
      return <StateView type="loading" message={mode === 'shopper' ? '載入需求中...' : '載入行程中...'} />;
    }
    if (error) {
      return <StateView type="error" message={error} onRetry={handleRetry} />;
    }
    return <StateView type="empty" message={mode === 'shopper' ? '目前沒有需求' : '目前沒有行程'} />;
  };

  // 渲染 Header（Hero + Search + Section Title）
  const renderHeader = () => {
    if (mode === 'shopper') {
      // 代購（接單）模式
      return (
        <>
          <ModeToggle mode={mode} onModeChange={setMode} />
          
          <HeroBanner
            title="開始接單賺錢"
            subtitle="利用你的行程，幫他人代購賺收入"
            buttonText="發布行程"
            onButtonPress={() => router.push('/create?type=trip')}
            variant="orange"
          />

          <SearchRow
            placeholder="搜尋可接需求、目的地、關鍵字"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFilterPress={handleFilterPress}
          />

          <Text style={styles.hintText}>可先瀏覽熱門需求，或用關鍵字搜尋</Text>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>熱門需求</Text>
            <Text style={styles.sectionSubtitle}>可接單的代購需求</Text>
          </View>
        </>
      );
    } else {
      // 買家模式
      return (
        <>
          <ModeToggle mode={mode} onModeChange={setMode} />
          
          <HeroBanner
            title="找到可靠的代購"
            subtitle="發布需求，輕鬆購買全球商品"
            buttonText="發布需求"
            onButtonPress={() => router.push('/create')}
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
    }
  };

  return (
    <Screen style={{ backgroundColor: '#F6F7FB' }}>
      {/* 临时 UI v2 badge */}
      <View style={{ position: 'absolute', top: 60, right: 16, zIndex: 9999, backgroundColor: '#FF6B35', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>UI v2</Text>
      </View>
      
      <TopBar
        userEmail={user?.email}
        onBellPress={handleBellPress}
        onAvatarPress={handleAvatarPress}
      />
      
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={filteredData.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        numColumns={1}
      />

      {/* Push 狀態顯示（Debug Only，僅在移動設備上顯示） */}
      {Platform.OS !== 'web' && pushStatus && !pushStatus.granted && pushStatus.error !== 'Web 平台不支持推送通知' && (
        <View style={styles.pushDebugContainer}>
          <Text style={styles.pushDebugLabel}>
            Push: {pushStatus.granted ? '✅ granted' : '❌ denied'}
          </Text>
          {pushStatus.error && (
            <Text style={styles.pushDebugError}>{pushStatus.error}</Text>
          )}
        </View>
      )}

      {/* 測試通知按鈕（暫時隱藏，避免影響 ScrollView） */}
      {false && __DEV__ && (
        <TouchableOpacity
          style={styles.testNotificationButton}
          onPress={handleTestNotification}
        >
          <Text style={styles.testNotificationButtonText}>🔔 測試通知 Deep Link</Text>
        </TouchableOpacity>
      )}

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
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24, // text-2xl
    fontWeight: fontWeight.bold,
    color: '#111827',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  list: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: 0,
    backgroundColor: '#F6F7FB', // 页面背景色
  },
  emptyList: {
    flexGrow: 1,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  pushDebugContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pushDebugLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  pushDebugError: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  testNotificationButton: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.brandOrange,
    borderRadius: 12,
    alignItems: 'center',
  },
  testNotificationButtonText: {
    fontSize: fontSize.base,
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
});
