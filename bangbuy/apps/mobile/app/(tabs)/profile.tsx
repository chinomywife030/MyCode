import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Screen, Card, Button, StateView } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { getCurrentUser, signOut } from '@/src/lib/auth';
import { getProfileStats, type ProfileStats, getCurrentProfile, type UserProfile } from '@/src/lib/profile';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

/**
 * Custom Hook: Handle all Profile Logic
 * - Manages state (user, profile, stats)
 * - Handles data fetching (parallel)
 * - Manages side effects (focus, mount)
 */
function useProfileLogic() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    wishesCount: 0,
    tripsCount: 0,
    completedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Track mount state to prevent updates on unmounted component
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Main fetch function (optimized for parallelism)
   * @param isSilent If true, doesn't show full screen loading
   */
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isMounted.current) return;

    // Only show full loading on first load
    if (!isSilent) {
      setLoading(true);
    }
    setStatsLoading(true);

    try {
      // 1. Get User
      const currentUser = await getCurrentUser();
      if (!isMounted.current) return;
      setUser(currentUser);

      if (currentUser) {
        // 2. Parallel Fetch: Profile & Stats
        const [profileData, statsData] = await Promise.all([
          getCurrentProfile(),
          getProfileStats()
        ]);

        if (isMounted.current) {
          setProfile(profileData);
          setStats(statsData);
        }
      } else {
        // User logged out state
        if (isMounted.current) {
          setProfile(null);
          setStats({ wishesCount: 0, tripsCount: 0, completedCount: 0 });
        }
      }

    } catch (error) {
      console.error('[useProfileLogic] fetchData error:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setStatsLoading(false);
      }
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Silent Refresh on Focus
  useFocusEffect(
    useCallback(() => {
      // Use logic to determine if we should refresh (e.g., usually always good to sync on focus)
      // Passing true for silent refresh
      if (user?.id) {
        // Only refresh if we think we are logged in, otherwise let the initial effect handle it
        fetchData(true);
      }
    }, [fetchData, user?.id])
  );

  const handleSignOut = async () => {
    Alert.alert('確認登出', '確定要登出嗎？', [
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
    ]);
  };

  return {
    user,
    profile,
    stats,
    loading,
    statsLoading,
    handleSignOut,
  };
}

export default function ProfileScreen() {
  const { user, profile, stats, loading, statsLoading, handleSignOut } = useProfileLogic();

  // Optimization: Memoize menu items to prevent re-creation
  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: 'my-wishes',
      icon: 'gift-outline',
      label: '我的需求',
      onPress: () => router.push('/me/wishes'),
    },
    {
      id: 'my-trips',
      icon: 'airplane-outline',
      label: '我的行程',
      onPress: () => router.push('/me/trips'),
    },
    {
      id: 'my-discoveries',
      icon: 'compass-outline',
      label: '我的旅途發現',
      onPress: () => router.push('/me/discoveries'),
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: '設定',
      onPress: () => router.push('/settings'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: '聯絡我們',
      onPress: () => router.push('/help'),
    },
  ], []);

  // Optimization: Memoize Avatar URL cache-busting logic
  const displayAvatarUrl = useMemo(() => {
    if (!profile?.avatar_url) return null;
    const baseUrl = profile.avatar_url.split('?')[0];
    const timestamp = Date.now(); // Note: This will update on every render if not memoized carefully.
    // However, if we want it to update only when profile.avatar_url changes, this is fine.
    // But typically we want to bust cache only when profile actually updates.
    // Since we fetch profile on focus, it might be better to just use the url as is if backend handles it,
    // OR just stick to the original logic which re-calculated on render.
    // Preserving original behavior but memoizing on profile.avatar_url dependency.
    return `${baseUrl}?v=${timestamp}`;
  }, [profile?.avatar_url]);


  if (loading) {
    return (
      <Screen>
        <StateView type="loading" message="載入用戶資料..." />
      </Screen>
    );
  }

  // 未登入狀態
  if (!user) {
    return (
      <Screen>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Ionicons name="person-circle-outline" size={80} color={colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>尚未登入</Text>
          <Text style={styles.guestSubtitle}>登入後即可查看個人資料與管理需求</Text>
          <Button
            title="立即登入"
            onPress={() => router.push('/login')}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.loginButton}
          />
          <Button
            title="註冊帳號"
            onPress={() => router.push('/login')}
            variant="outline"
            size="lg"
            fullWidth
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 用戶資訊卡片 */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {displayAvatarUrl ? (
              <Image
                key={profile?.avatar_url || 'no-avatar'}
                source={{ uri: displayAvatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(profile?.display_name || profile?.name || user?.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {profile?.display_name || profile?.name || user?.email?.split('@')[0] || '未設定暱稱'}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/me/edit-profile')}
            >
              <Ionicons name="create-outline" size={20} color={colors.brandOrange} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* 統計資訊 */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {statsLoading ? '...' : stats.wishesCount}
              </Text>
              <Text style={styles.statLabel}>我的需求</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {statsLoading ? '...' : stats.tripsCount}
              </Text>
              <Text style={styles.statLabel}>我的行程</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {statsLoading ? '...' : stats.completedCount}
              </Text>
              <Text style={styles.statLabel}>已完成</Text>
            </View>
          </View>
        </Card>

        {/* 選單 */}
        <Card style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={item.color || colors.text} />
                <Text style={[styles.menuItemLabel, item.color && { color: item.color }]}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* 登出按鈕 */}
        <Button
          title="登出"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          style={styles.signOutButton}
        />

        {/* 版本資訊 */}
        <Text style={styles.versionText}>BangBuy v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  guestIconContainer: {
    marginBottom: spacing.lg,
  },
  guestTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  editButton: {
    padding: spacing.sm,
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  menuCard: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: fontSize.base,
    color: colors.text,
    marginLeft: spacing.md,
  },
  signOutButton: {
    marginBottom: spacing.lg,
  },
  versionText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
