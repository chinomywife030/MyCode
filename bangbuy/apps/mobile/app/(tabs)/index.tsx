import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Libraries
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getDiscoveries, type Discovery } from '@/src/lib/discoveries';
import { getCurrentUser } from '@/src/lib/auth';
import { supabaseService } from '@/src/lib/supabase';

// Components & UI
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { RoleSwitch } from '@/src/components/RoleSwitch';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';
import { DiscoveryCard } from '@/src/components/DiscoveryCard';
import { type Mode } from '@/src/ui/ModeToggle';

/**
 * ==================================================================================
 * HOME SCREEN (Restored Structure)
 * ==================================================================================
 * - Agent Mode (shopper): Hero (Start Earning) + Hot Wishes
 * - Buyer Mode (buyer): Discoveries + Trending Wishes
 */
export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

  // State
  const [mode, setMode] = useState<Mode>('shopper'); // shopper = Agent (代購), buyer = Buyer (買家)
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Load Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!supabaseService.isConfigured()) return;

    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      else if (wishes.length === 0) setLoading(true);

      // Fetch Wishes (Used by both modes currently, or filtered)
      const wishData = await getWishes({ keyword: searchQuery, ...filters });
      setWishes(wishData || []);

      // Fetch Discoveries (Only for Buyer typically, but safe to fetch)
      if (mode === 'buyer') {
        const discoveryData = await getDiscoveries({ limit: 5 });
        setDiscoveries(discoveryData || []);
      }

    } catch (err: any) {
      console.error('LoadData Error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, searchQuery, filters, wishes.length]);

  // Effects
  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, mode, loadData]);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  // Handlers
  const handleRefresh = () => loadData(true);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleWishPress = (id: string) => router.push(`/wish/${id}`);
  const handleDiscoveryPress = (id: string) => router.push(`/discovery/${id}`);
  const handleFilterPress = () => setFilterModalVisible(true);
  const handlePostTrip = () => router.push('/trip/create');

  // Render Components
  const renderHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      {/* Top Bar with Role Switch */}
      <View style={styles.topBar}>
        <View style={styles.roleSwitchContainer}>
          <RoleSwitch mode={mode} onChange={handleModeChange} />
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => user ? router.push('/(tabs)/profile') : router.push('/login')}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* AGENT HOME HERO */}
      {mode === 'shopper' && (
        <View style={{ marginBottom: spacing.md }}>
          <HeroBanner
            title="開始接單賺錢"
            subtitle="發布你的行程，讓需要的人直接私訊你"
            buttonText="發布行程"
            onButtonPress={handlePostTrip}
            variant="orange"
          />
        </View>
      )}

      {/* Search Bar */}
      <SearchRow
        placeholder={mode === 'shopper' ? "搜尋目的地、商品..." : "搜尋需求..."}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilterPress={handleFilterPress}
      />

      {/* Helper Text */}
      {mode === 'shopper' && (
        <Text style={styles.hintText}>行程越清楚（城市/日期/可幫買品類）越容易成交</Text>
      )}

      {/* DISCOVERIES (Buyer Only) */}
      {mode === 'buyer' && discoveries.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Journey Finds</Text>
          </View>
          <FlatList
            data={discoveries}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => (
              <View style={{ width: 280, marginRight: spacing.md }}>
                <DiscoveryCard
                  id={item.id}
                  title={item.title}
                  image={item.image}
                  country={item.country}
                  city={item.city}
                  authorName={item.authorName}
                  authorAvatar={item.authorAvatar}
                  onPress={() => handleDiscoveryPress(item.id)}
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Wishes Title */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text style={styles.sectionTitle}>
          {mode === 'shopper' ? '熱門需求' : 'Trending Wishes'}
        </Text>
      </View>
    </View>
  ), [mode, searchQuery, user, discoveries]);

  const renderItem = ({ item }: { item: Wish }) => (
    <WishCard
      id={item.id}
      title={item.title}
      country={item.targetCountry}
      images={item.images}
      budget={item.budget}
      buyer={item.buyer}
      status={item.status}
      onPress={() => handleWishPress(item.id)}
    />
  );

  return (
    <Screen style={styles.container} preset="fixed">
      <FlatList
        data={wishes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暫無需求</Text>
            </View>
          ) : <StateView type="loading" />
        }
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setFilterModalVisible(false);
          loadData(true);
        }}
        initialFilters={filters}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  roleSwitchContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  avatarButton: {
    padding: 4,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
