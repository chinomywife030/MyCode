import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
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

export default function ProfileScreen() {
  console.count('ME_RENDER');
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats>({
    wishesCount: 0,
    tripsCount: 0,
    completedCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // 使用 ref 追蹤 inFlight 狀態，避免重複並發請求
  const userLoadingRef = useRef(false);
  const profileLoadingRef = useRef(false);
  const statsLoadingRef = useRef(false);
  // 追蹤已載入的 userId，只在 userId 改變時重新載入
  const loadedUserIdRef = useRef<string | null>(null);

  // loadUser 用 useCallback 包裝，避免每次 render 都創建新函數
  // 不依賴 user，避免循環
  const loadUser = useCallback(async () => {
    // 如果正在載入，跳過
    if (userLoadingRef.current) {
      return;
    }

    try {
      userLoadingRef.current = true;
      console.log('ME_LOAD_START: loadUser');
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      // 使用函數式更新，避免依賴 user
      setUser((prevUser) => {
        // 只在 userId 改變時更新（避免不必要的 re-render）
        if (currentUser?.id !== prevUser?.id) {
          return currentUser;
        }
        return prevUser;
      });
    } catch (error) {
      console.error('[ProfileScreen] loadUser error:', error);
    } finally {
      setLoading(false);
      userLoadingRef.current = false;
      console.log('ME_LOAD_DONE: loadUser');
    }
  }, []); // 空依賴，確保函數穩定

  // loadProfile 用 useCallback 包裝
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    
    // 如果正在載入，跳過
    if (profileLoadingRef.current) {
      return;
    }

    try {
      profileLoadingRef.current = true;
      console.log('ME_LOAD_START: loadProfile');
      const profileData = await getCurrentProfile();
      
      // 直接設置 profile，不修改 avatar_url（cache busting 在 render 時處理）
      setProfile(profileData);
    } catch (error) {
      console.error('[ProfileScreen] loadProfile error:', error);
    } finally {
      profileLoadingRef.current = false;
      console.log('ME_LOAD_DONE: loadProfile');
    }
  }, [user?.id]);

  // loadStats 用 useCallback 包裝
  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    
    // 如果正在載入，跳過
    if (statsLoadingRef.current) {
      return;
    }
    
    try {
      statsLoadingRef.current = true;
      console.log('ME_LOAD_START: loadStats');
      setStatsLoading(true);
      const statsData = await getProfileStats();
      setStats(statsData);
    } catch (error) {
      console.error('[ProfileScreen] loadStats error:', error);
    } finally {
      setStatsLoading(false);
      statsLoadingRef.current = false;
      console.log('ME_LOAD_DONE: loadStats');
    }
  }, [user?.id]);

  // 首次載入：只在組件掛載時載入 user（使用 useEffect，只執行一次）
  useEffect(() => {
    // 只在首次載入時執行（loadedUserIdRef.current 為 null 且不在載入中）
    if (loadedUserIdRef.current === null && !userLoadingRef.current) {
      loadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依賴，只執行一次（loadUser 是穩定的，不需要在依賴中）

  // 當 user.id 改變時，載入 profile 和 stats
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // 如果 userId 沒有改變，不重新載入
    if (currentUserId === loadedUserIdRef.current) {
      return;
    }
    
    // 更新已載入的 userId
    loadedUserIdRef.current = currentUserId;
    
    if (currentUserId) {
      // 有 user，載入 profile 和 stats
      loadProfile();
      loadStats();
    } else {
      // 用戶登出，清空資料
      setProfile(null);
      setStats({ wishesCount: 0, tripsCount: 0, completedCount: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 只依賴 user?.id，loadProfile 和 loadStats 內部會檢查 user?.id

  // 當頁面獲得焦點時，重新載入 profile（從編輯頁返回時）
  useFocusEffect(
    useCallback(() => {
      // 如果已經有 user，重新載入 profile 以確保顯示最新資料（包括頭像）
      if (user?.id && loadedUserIdRef.current === user.id && !profileLoadingRef.current) {
        console.log('[ProfileScreen] useFocusEffect: reloading profile after returning from edit');
        loadProfile();
      }
    }, [user?.id, loadProfile])
  );

  const handleSignOut = () => {
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

  const menuItems: MenuItem[] = [
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
  ];

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

  // 計算顯示用的 avatar URL（包含 cache busting）
  // 使用 profile.avatar_url 作為基礎，確保當 avatar_url 改變時 key 也會改變
  const displayAvatarUrl = profile?.avatar_url
    ? (() => {
        const baseUrl = profile.avatar_url.split('?')[0]; // 移除現有的 query string
        const timestamp = Date.now();
        return `${baseUrl}?v=${timestamp}`;
      })()
    : null;

  return (
    <Screen>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 用戶資訊卡片 */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {displayAvatarUrl ? (
              <Image
                key={profile.avatar_url || 'no-avatar'}
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




