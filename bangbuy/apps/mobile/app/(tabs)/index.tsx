import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, Alert, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native'; // Standard Hook
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Libraries
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getTrips, formatDateRange, type Trip } from '@/src/lib/trips';
import { getDiscoveries, type Discovery } from '@/src/lib/discoveries';
import { getNotificationPermission } from '@/src/lib/push';
import { getCurrentUser } from '@/src/lib/auth';
import { getCurrentProfile } from '@/src/lib/profile';
import { supabaseService } from '@/src/lib/supabase'; // Use new service
import { startChat } from '@/src/lib/chat';

// Components & UI
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, TripCard, StateView, FilterModal, type FilterOptions, type Mode } from '@/src/ui';
import { RoleSwitch } from '@/src/components/RoleSwitch';
import { colors } from '@/src/theme/tokens';
import { QuickWishModal } from '@/src/components/QuickWishModal';
import { DiscoveryCard } from '@/src/components/DiscoveryCard';
import { StableSearchBar } from '@/src/components/StableSearchBar';

// ImmoScout UI
import { immoColors } from '@/src/ui/immo/theme';
import { ImmoScoutSearchBar } from '@/src/ui/immo/ImmoScoutSearchBar';
import { ImmoScoutFilterChips } from '@/src/ui/immo/ImmoScoutFilterChips';
import { ImmoScoutWishCard, ImmoScoutWishCardSkeleton } from '@/src/ui/immo/ImmoScoutWishCard';
import { ImmoScoutTripCard, ImmoScoutTripCardSkeleton } from '@/src/ui/immo/ImmoScoutTripCard';
import { ImmoScoutDiscoveryCard } from '@/src/ui/immo/ImmoScoutDiscoveryCard';
import {
  normalizeWishForCard,
  normalizeTripForCard,
  normalizeDiscoveryForCard
} from '@/src/ui/immo/immoAdapters';

/**
 * ==================================================================================
 * SAFE ADAPTERS (Prevent invalid data crashes)
 * ==================================================================================
 */
const safeNormalizeWishForCard = (wish: any) => {
  try {
    return normalizeWishForCard(wish);
  } catch (e) {
    return { id: wish?.id || 'error', title: 'Error loading item', country: '', image: '', images: [], price: 0, priceFormatted: '', userName: '', status: '', statusText: '' };
  }
};

const safeNormalizeTripForCard = (trip: any, dateRange?: string) => {
  try {
    return normalizeTripForCard(trip, dateRange);
  } catch (e) {
    return { id: trip?.id || 'error', destination: 'Error', description: '', dateRange: '', ownerName: '', ownerAvatar: '', ownerInitial: '' };
  }
};

const safeNormalizeDiscoveryForCard = (discovery: any) => {
  try {
    return normalizeDiscoveryForCard(discovery);
  } catch (e) {
    return { id: discovery?.id || 'error', title: 'Error', country: '', city: '', image: '', images: [], authorName: '', authorInitial: '', authorId: '' };
  }
};

/**
 * ==================================================================================
 * HOME SCREEN (STABLE VERSION)
 * ==================================================================================
 */
export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused(); // Stable Focus tracking

  // State
  const [mode, setMode] = useState<Mode>('shopper');
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // User State
  const [user, setUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  /**
   * Data Fetching - Wrapped in strict try/catch
   */
  const loadData = useCallback(async (isRefresh = false) => {
    if (!supabaseService.isConfigured()) {
      setError("Configuration Missing");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      else if (wishes.length === 0 && trips.length === 0) setLoading(true);

      // 1. Fetch Main List
      if (mode === 'shopper') {
        const data = await getWishes({ keyword: searchQuery, ...filters });
        setWishes(data || []);
      } else {
        const data = await getTrips({ keyword: searchQuery, sortBy: 'newest' }); // Simplified sort for stability
        setTrips(data || []);
      }

      // 2. Fetch Discoveries (Independent, safe)
      try {
        const discoveryData = await getDiscoveries({ limit: 10 });
        setDiscoveries(discoveryData || []);
      } catch (discError) {
        console.warn('Failed to load discoveries', discError);
        // Do not block main content
      }

    } catch (err: any) {
      console.error('LoadData Error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, searchQuery, filters]);

  /**
   * Standard Effect for Focus & Mode Changes
   * Replaces useFocusEffect
   */
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, mode, loadData]);

  // Load User once
  useEffect(() => {
    const initUser = async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
        if (u) {
          const p = await getCurrentProfile();
          setCurrentUserProfile(p);
        }
      } catch (e) {
        console.warn('User Init Error', e);
      }
    };
    initUser();
  }, []);

  // Handlers
  const handleRefresh = () => loadData(true);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    // Data load triggered by effect
  };

  const handleWishPress = (id: string) => router.push(`/wish/${id}`);
  const handleTripPress = (id: string) => router.push(`/trip/${id}`);

  const handleDiscoveryPress = (id: string) => router.push(`/discovery/${id}`);

  /**
   * UI: Discoveries Section
   */
  const DiscoveriesSection = useMemo(() => {
    /* Only show if we have data */
    if (!discoveries?.length) return null;

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Journey Finds</Text>
        </View>
        <FlatList
          data={discoveries}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ width: 300, marginRight: 16 }}>
              <ImmoScoutDiscoveryCard
                display={safeNormalizeDiscoveryForCard(item)}
                onPress={() => handleDiscoveryPress(item.id)}
                currentUserId={user?.id}
              />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>
    );
  }, [discoveries, user]);

  /**
   * UI: List Header
   */
  const renderHeader = useMemo(() => (
    <View>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <RoleSwitch mode={mode} onModeChange={handleModeChange} />
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={() => user ? router.push('/(tabs)/profile') : router.push('/login')}>
          <Ionicons name="person-circle-outline" size={32} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <ImmoScoutSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery} // Debounce removed for simplicity/stability in this pass
          placeholder={mode === 'shopper' ? "Search wishes..." : "Search trips..."}
          onFilterPress={() => setFilterModalVisible(true)}
        />
      </View>

      {/* Discoveries Section */}
      {DiscoveriesSection}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {mode === 'shopper' ? 'Trending Wishes' : 'Upcoming Trips'}
        </Text>
      </View>
    </View>
  ), [mode, searchQuery, user, DiscoveriesSection]);


  /**
   * UI: Render Item
   */
  const renderItem = ({ item }: { item: Wish | Trip }) => {
    if (mode === 'shopper') {
      const wish = item as Wish;
      return (
        <ImmoScoutWishCard
          display={safeNormalizeWishForCard(wish)}
          onPress={() => handleWishPress(wish.id)}
        />
      );
    } else {
      const trip = item as Trip;
      return (
        <ImmoScoutTripCard
          display={safeNormalizeTripForCard(trip, formatDateRange(trip.startDate, trip.endDate))}
          onPress={() => handleTripPress(trip.id)}
        />
      );
    }
  };

  return (
    <Screen style={styles.container} preset="fixed">
      <FlatList
        data={mode === 'shopper' ? wishes : trips}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 20 }}>
              <ImmoScoutWishCardSkeleton />
              <ImmoScoutWishCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found</Text>
              {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
            </View>
          )
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setFilterModalVisible(false);
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  avatarButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
