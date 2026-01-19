import { StyleSheet, FlatList, RefreshControl, Alert, Platform, View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getNotificationPermission, registerPushToken } from '@/src/lib/push';
import { signOut, getCurrentUser } from '@/src/lib/auth';
import { supabase } from '@/src/lib/supabase';
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, StateView, FilterModal, type FilterOptions } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

/**
 * 需求頁面內容組件
 * 原本的 WishesScreen 組件
 */
export function WishesPageContent() {
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pushStatus, setPushStatus] = useState<{ granted: boolean; token: string | null; error?: string } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({});

    const fetchWishes = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const data = await getWishes();
            setWishes(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
            setError(errorMessage);
            console.error('[WishesPageContent] fetchWishes error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWishes();
        loadPushStatus();
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // 確保 session 存在後才註冊 push token
        if (currentUser) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user) {
                    await registerPushToken();
                    console.log('[WishesPageContent] Push token re-registered for logged-in user');
                }
            } catch (pushError) {
                console.warn('[WishesPageContent] Failed to re-register push token:', pushError);
            }
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            '確認登出',
            '確定要登出嗎？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '登出',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await signOut();
                        if (result.success) {
                            setUser(null);
                            router.replace('/');
                        } else {
                            Alert.alert('錯誤', result.error || '登出失敗');
                        }
                    },
                },
            ]
        );
    };

    const loadPushStatus = async () => {
        const status = await getNotificationPermission();
        setPushStatus(status);
    };

    const handleRetryPush = async () => {
        const result = await registerPushToken();
        if (result.success) {
            await loadPushStatus();
        }
    };

    const handleRefresh = () => {
        fetchWishes(true);
    };

    const handleRetry = () => {
        fetchWishes();
    };

    const handleWishPress = (wishId: string) => {
        router.push(`/wishes/${wishId}` as any);
    };

    const handleWishMessagePress = (wish: Wish) => {
        // TODO: 实现消息功能
        console.log('[WishesPageContent] Message pressed for wish:', wish.id);
    };

    // 過濾 wishes（根據搜尋關鍵字和篩選條件）
    const filteredWishes = wishes.filter((wish) => {
        // 搜尋關鍵字過濾
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            if (!wish.title.toLowerCase().includes(lowerQuery)) {
                return false;
            }
        }

        // 國家篩選
        if (filters.country && wish.targetCountry !== filters.country) {
            return false;
        }

        // 分類篩選
        if (filters.category && wish.category !== filters.category) {
            return false;
        }

        // 狀態篩選
        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'open' && wish.status !== 'open') {
                return false;
            }
            if (filters.status === 'closed' && wish.status === 'open') {
                return false;
            }
        }

        return true;
    });

    const handleFilterPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilterModalVisible(true);
    };

    const handleFilterApply = (newFilters: FilterOptions) => {
        setFilters(newFilters);
        // 重新載入資料（如果需要後端篩選，可以在這裡調用 API）
        fetchWishes(true);
    };

    const handleFilterClear = () => {
        setFilters({});
        fetchWishes(true);
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
            onMessagePress={() => handleWishMessagePress(item)}
        />
    );

    const renderEmpty = () => {
        if (loading) {
            return <StateView type="loading" message="載入需求中..." />;
        }
        if (error) {
            return <StateView type="error" message={error} onRetry={handleRetry} />;
        }
        return <StateView type="empty" message="目前沒有需求" />;
    };

    const renderHeader = () => (
        <>
            <HeroBanner
                title="找到可靠的代購"
                subtitle="發布需求，讓在海外的代購者主動來報價"
                buttonText="發布需求"
                onButtonPress={() => router.push('/wishes/create')}
                variant="orange"
            />

            <SearchRow
                placeholder="搜尋需求..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFilterPress={handleFilterPress}
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
                onBellPress={handleBellPress}
                onAvatarPress={handleAvatarPress}
            />

            <FlatList
                data={filteredWishes}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={filteredWishes.length === 0 ? styles.emptyList : styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={renderEmpty}
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
                    <TouchableOpacity style={styles.pushRetryButton} onPress={handleRetryPush}>
                        <Text style={styles.pushRetryButtonText}>重試註冊</Text>
                    </TouchableOpacity>
                </View>
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
    pushRetryButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.brandOrange,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    pushRetryButtonText: {
        color: '#ffffff',
        fontSize: fontSize.sm,
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
