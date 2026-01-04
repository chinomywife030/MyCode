import { StyleSheet, View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, StateView } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';
import { supabase } from '@/src/lib/supabase';

interface MyWish {
  id: string;
  title: string;
  budget?: number;
  price?: number;
  commission?: number;
  status?: string;
  created_at: string;
}

export default function MyWishesScreen() {
  const [wishes, setWishes] = useState<MyWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWishes();
  }, []);

  const loadWishes = async (isRefresh = false) => {
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
        .from('wish_requests')
        .select('id, title, budget, price, commission, status, created_at')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MyWishesScreen] Error:', error);
        setWishes([]);
      } else {
        setWishes(data || []);
      }
    } catch (error) {
      console.error('[MyWishesScreen] Exception:', error);
      setWishes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadWishes(true);
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'open': return '開放中';
      case 'in_progress': return '進行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      case 'closed': return '已關閉';
      default: return '未知';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open': return colors.brandOrange;
      case 'in_progress': return colors.brandBlue;
      case 'completed': return '#10B981';
      case 'cancelled': return colors.textMuted;
      case 'closed': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const calculateTotal = (wish: MyWish) => {
    if (wish.budget && wish.budget > 0) {
      return wish.budget;
    }
    if (wish.price && wish.commission) {
      return wish.price + wish.commission;
    }
    return wish.price || 0;
  };

  const renderItem = ({ item }: { item: MyWish }) => (
    <TouchableOpacity
      style={styles.wishItem}
      onPress={() => router.push(`/wish/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.wishContent}>
        <Text style={styles.wishTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.wishMeta}>
          <Text style={styles.wishPrice}>
            NT$ {calculateTotal(item).toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.wishDate}>
          {new Date(item.created_at).toLocaleDateString('zh-TW')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading && wishes.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的需求</Text>
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
        <Text style={styles.headerTitle}>我的需求</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={wishes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={wishes.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <StateView type="empty" message="目前沒有需求" />
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
  wishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wishContent: {
    flex: 1,
  },
  wishTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  wishMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  wishPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.brandOrange,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  wishDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

