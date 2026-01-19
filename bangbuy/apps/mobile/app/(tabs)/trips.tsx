import { StyleSheet, FlatList, RefreshControl, View, Text, Alert } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Libs
import { getTrips, getMoments, formatDateRange, type Trip, type TravelMoment } from '@/src/lib/trips';
import { getCurrentUser } from '@/src/lib/auth';
import { startChat } from '@/src/lib/chat';

// UI
import { Screen, TopBar, HeroBanner, SearchRow, TripCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { MomentCard } from '@/src/components/MomentCard';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

// ============================================
// Types
// ============================================

type FeedItem =
    | (Trip & { type: 'trip' })
    | (TravelMoment & { type: 'moment' });

// ============================================
// Logic Hook: useTripsLogic
// ============================================

function useTripsLogic() {
    const isMounted = useRef(true);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({});
    const [messageLoading, setMessageLoading] = useState<string | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isMounted.current) return;

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Fetch in parallel
            const [tripsData, momentsData] = await Promise.all([
                getTrips(),
                getMoments(),
            ]);

            if (!isMounted.current) return;

            const tripsWithType: FeedItem[] = tripsData.map((t) => ({ ...t, type: 'trip' as const }));
            const momentsWithType: FeedItem[] = momentsData.map((m) => ({ ...m, type: 'moment' as const }));

            // Merge & Sort (Newest first)
            const merged = [...tripsWithType, ...momentsWithType].sort((a, b) => {
                const aTime = a.type === 'trip'
                    ? (a.createdAt ? new Date(a.createdAt).getTime() : 0)
                    : new Date(a.created_at).getTime();
                const bTime = b.type === 'trip'
                    ? (b.createdAt ? new Date(b.createdAt).getTime() : 0)
                    : new Date(b.created_at).getTime();
                return bTime - aTime;
            });

            setFeedItems(merged);

        } catch (err: any) {
            if (isMounted.current) {
                setError(err.message || '無法載入行程');
                console.error('[useTripsLogic] Load Error:', err);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    const loadUser = useCallback(async () => {
        try {
            const u = await getCurrentUser();
            if (isMounted.current) setUser(u);
        } catch (e) {
            console.warn('User load failed', e);
        }
    }, []);

    // Handlers
    const handleRefresh = useCallback(() => loadData(true), [loadData]);

    const handleFilterApply = useCallback((newFilters: FilterOptions) => {
        setFilters(newFilters);
        loadData(true);
    }, [loadData]);

    // Derived State (Filtering)
    const filteredItems = feedItems.filter((item) => {
        if (!searchQuery.trim()) return true;
        const lowerQ = searchQuery.toLowerCase();

        if (item.type === 'trip') {
            return (
                item.destination.toLowerCase().includes(lowerQ) ||
                (item.description && item.description.toLowerCase().includes(lowerQ)) ||
                (item.owner?.name && item.owner.name.toLowerCase().includes(lowerQ))
            );
        } else {
            return (
                (item.description && item.description.toLowerCase().includes(lowerQ)) ||
                (item.location && item.location.toLowerCase().includes(lowerQ))
            );
        }
    });

    return {
        // State
        feedItems,
        filteredItems,
        loading,
        refreshing,
        error,
        user,
        searchQuery,
        setSearchQuery,
        filterModalVisible,
        setFilterModalVisible,
        filters,
        messageLoading,
        setMessageLoading,

        // Actions
        loadData,
        loadUser,
        handleRefresh,
        handleFilterApply,
    };
}

// ============================================
// Main Component: TripsScreen
// ============================================

export default function TripsScreen() {
    const {
        filteredItems,
        loading,
        refreshing,
        error,
        user,
        searchQuery,
        setSearchQuery,
        filterModalVisible,
        setFilterModalVisible,
        filters,
        messageLoading,
        setMessageLoading,
        handleRefresh,
        handleFilterApply,
        loadData,
        loadUser
    } = useTripsLogic();

    // Effects
    useEffect(() => {
        loadData();
        loadUser();
    }, [loadData, loadUser]);

    useFocusEffect(
        useCallback(() => {
            if (user?.id) loadData(true); // Silent refresh on focus
        }, [user?.id, loadData])
    );

    // Interaction Handlers
    const handleStartChat = async (targetId: string, type: 'trip' | 'direct', contextId?: string, summary?: string) => {
        if (messageLoading) return;
        try {
            setMessageLoading(contextId || targetId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const result = await startChat(targetId, type, contextId, summary);

            if (!result.success) {
                Alert.alert('錯誤', result.error || '無法開啟對話');
            }
        } catch (e: any) {
            console.error('Chat Error:', e);
            Alert.alert('錯誤', e.message);
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
                    onPress={() => router.push(`/trip/${item.id}` as any)}
                    onMessagePress={() => handleStartChat(item.shopperId, 'trip', item.id, item.destination)}
                />
            );
        } else {
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
                    onChatPress={() => handleStartChat(item.user_id, 'direct', undefined, item.description || '旅行時刻')}
                />
            );
        }
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
                placeholder="搜尋目的地、關鍵字"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterModalVisible(true);
                }}
            />
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
                onBellPress={() => router.push('/(tabs)/notifications')}
                onAvatarPress={() => user ? router.push('/(tabs)/profile') : router.push('/login')}
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
                ListEmptyComponent={
                    loading ? <StateView type="loading" message="載入中..." /> :
                        error ? <StateView type="error" message={error} onRetry={() => loadData()} /> :
                            <StateView type="empty" message="目前沒有內容" />
                }
            />

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={handleFilterApply}
                onClear={() => {
                    // Clear filters
                    handleFilterApply({});
                }}
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
});
