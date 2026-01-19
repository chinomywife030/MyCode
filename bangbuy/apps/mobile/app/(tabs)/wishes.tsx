import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Libs
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getNotificationPermission, registerPushToken } from '@/src/lib/push';
import { getCurrentUser } from '@/src/lib/auth';
import { supabase } from '@/src/lib/supabase';

// UI
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

// ============================================
// Logic Hook: useWishesLogic
// ============================================

function useWishesLogic() {
    const isMounted = useRef(true);

    const [wishes, setWishes] = useState<Wish[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [user, setUser] = useState<any>(null);
    const [pushStatus, setPushStatus] = useState<{ granted: boolean; token: string | null; error?: string } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({});

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isMounted.current) return;

        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const data = await getWishes();

            if (isMounted.current) {
                setWishes(data || []);
            }
        } catch (err: any) {
            if (isMounted.current) {
                setError(err.message || '無法載入需求');
                console.error('[useWishesLogic] Load Error:', err);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    const loadUserAndPush = useCallback(async () => {
        try {
            const u = await getCurrentUser();
            if (isMounted.current) setUser(u);

            if (u) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) {
                    // Register Push (Fire and forget, but log error)
                    registerPushToken().catch(e => console.warn('Push Reg Error', e));
                }
            }

            const status = await getNotificationPermission();
            if (isMounted.current) setPushStatus(status);

        } catch (e) {
            console.warn('User/Push load failed', e);
        }
    }, []);

    // Handlers
    const handleRefresh = useCallback(() => loadData(true), [loadData]);

    const handleFilterApply = useCallback((newFilters: FilterOptions) => {
        setFilters(newFilters);
        loadData(true); // Ideally pass filters to backend
    }, [loadData]);

    // Derived State
    const filteredWishes = wishes.filter((wish) => {
        if (searchQuery.trim()) {
            if (!wish.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }
        if (filters.country && wish.targetCountry !== filters.country) return false;
        if (filters.category && wish.category !== filters.category) return false;
        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'open' && wish.status !== 'open') return false;
            if (filters.status === 'closed' && wish.status === 'open') return false;
        }
        return true;
    });

    return {
        wishes: filteredWishes,
        loading,
        refreshing,
        error,
        user,
        pushStatus,
        searchQuery,
        setSearchQuery,
        filterModalVisible,
        setFilterModalVisible,
        filters,
        loadData,
        loadUserAndPush,
        handleRefresh,
        handleFilterApply,
    };
}

// ============================================
// Main Component: WishesScreen
// ============================================

export default function WishesScreen() {
    const {
        wishes,
        loading,
        refreshing,
        error,
        user,
        pushStatus,
        searchQuery,
        setSearchQuery,
        filterModalVisible,
        setFilterModalVisible,
        filters,
        loadData,
        loadUserAndPush,
        handleRefresh,
        handleFilterApply
    } = useWishesLogic();

    useEffect(() => {
        loadData();
        loadUserAndPush();
    }, [loadData, loadUserAndPush]);

    // UI Handlers
    const handleWishPress = (id: string) => {
        router.push(`/wish/${id}` as any);
    };

    const handleRetryPush = async () => {
        await registerPushToken();
        loadUserAndPush();
    };

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
            onMessagePress={() => console.log('Message Wish', item.id)} // TODO: Connect to Chat
        />
    );

    const renderHeader = () => (
        <>
            <HeroBanner
                title="找到可靠的代購"
                subtitle="發布需求，讓在海外的代購者主動來報價"
                buttonText="發布需求"
                onButtonPress={() => router.push('/create')} // TODO: Verify route
                variant="orange"
            />

            <SearchRow
                placeholder="搜尋需求..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterModalVisible(true);
                }}
            />

            <Text style={styles.hintText}>可先瀏覽熱門需求，或用關鍵字搜尋</Text>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>熱門需求</Text>
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
                data={wishes}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={wishes.length === 0 ? styles.emptyList : styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    loading ? <StateView type="loading" message="載入需求中..." /> :
                        error ? <StateView type="error" message={error} onRetry={() => loadData()} /> :
                            <StateView type="empty" message="目前沒有需求" />
                }
            />

            {/* Push Debug (Mobile Only) */}
            {Platform.OS !== 'web' && pushStatus && !pushStatus.granted && (
                <View style={styles.pushDebugContainer}>
                    <Text style={styles.pushDebugLabel}>Push 通知未開啟</Text>
                    <TouchableOpacity style={styles.pushRetryButton} onPress={handleRetryPush}>
                        <Text style={styles.pushRetryButtonText}>開啟通知</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onApply={handleFilterApply}
                onClear={() => handleFilterApply({})}
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
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['2xl'],
        paddingTop: 0,
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
        backgroundColor: '#FFF0F0',
        borderRadius: 12,
    },
    pushDebugLabel: {
        color: colors.error,
        fontSize: fontSize.sm,
        marginBottom: spacing.xs,
    },
    pushRetryButton: {
        backgroundColor: colors.error,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    pushRetryButtonText: {
        color: 'white',
        fontSize: fontSize.xs,
    },
});
