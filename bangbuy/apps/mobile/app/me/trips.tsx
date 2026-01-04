import { StyleSheet, View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, StateView } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';
import { supabase } from '@/src/lib/supabase';
import { formatDateRange } from '@/src/lib/trips';

interface MyTrip {
  id: string;
  destination: string;
  description?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export default function MyTripsScreen() {
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 使用 auth.uid() 獲取當前用戶ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .select('id, destination, description, date, start_date, end_date, created_at')
        .eq('shopper_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MyTripsScreen] Error:', error);
        setTrips([]);
      } else {
        setTrips(data || []);
      }
    } catch (error) {
      console.error('[MyTripsScreen] Exception:', error);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTrips(true);
  };

  const renderItem = ({ item }: { item: MyTrip }) => (
    <TouchableOpacity
      style={styles.tripItem}
      onPress={() => router.push(`/trip/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.tripContent}>
        <Text style={styles.tripDestination}>
          前往 {item.destination}
        </Text>
        {item.description && (
          <Text style={styles.tripDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.tripDate}>
          {item.start_date || item.end_date
            ? formatDateRange(item.start_date, item.end_date)
            : item.date
            ? new Date(item.date).toLocaleDateString('zh-TW')
            : '未設定日期'}
        </Text>
        <Text style={styles.tripCreated}>
          發布於 {new Date(item.created_at).toLocaleDateString('zh-TW')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading && trips.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的行程</Text>
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
        <Text style={styles.headerTitle}>我的行程</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={trips}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <StateView type="empty" message="目前沒有行程" />
        }
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
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripContent: {
    flex: 1,
  },
  tripDestination: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tripDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tripDate: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.brandBlue,
    marginBottom: spacing.xs,
  },
  tripCreated: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

