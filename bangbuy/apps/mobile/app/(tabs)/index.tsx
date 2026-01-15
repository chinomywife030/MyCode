import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity, Platform, Alert, Dimensions } from 'react-native';

// 🔍 最早期診斷：確認模塊開始載入
console.log('[HomeScreen] Module loading started...');

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { getWishes, type Wish } from '@/src/lib/wishes';
import { getTrips, formatDateRange, type Trip } from '@/src/lib/trips';
import { getDiscoveries, type Discovery } from '@/src/lib/discoveries';
import { getNotificationPermission, registerPushToken } from '@/src/lib/push';
import { signOut, getCurrentUser, getSession } from '@/src/lib/auth';
import { getCurrentProfile } from '@/src/lib/profile';
import { supabase } from '@/src/lib/supabase';
import { startChat } from '@/src/lib/chat';
// ✅ 保留原有 UI 組件（確保可編譯）
import { Screen, TopBar, HeroBanner, SearchRow, WishCard, TripCard, StateView, FilterModal, type FilterOptions, type Mode } from '@/src/ui';
import { RoleSwitch } from '@/src/components/RoleSwitch';
import { colors, spacing, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { QuickWishModal } from '@/src/components/QuickWishModal';
import { DiscoveryCard } from '@/src/components/DiscoveryCard';
import { StableSearchBar } from '@/src/components/StableSearchBar';

// ✅ 新增 ImmoScout 風格 UI 組件（直接引用檔案，避免循環引用）
import { immoColors, immoSpacing, immoRadius, immoTypography, immoShadows } from '@/src/ui/immo/theme';
import { ImmoScoutSearchBar } from '@/src/ui/immo/ImmoScoutSearchBar';
import { ImmoScoutFilterChips, defaultFilterChips } from '@/src/ui/immo/ImmoScoutFilterChips';
import { ImmoScoutWishCard, ImmoScoutWishCardSkeleton } from '@/src/ui/immo/ImmoScoutWishCard';
import { ImmoScoutTripCard, ImmoScoutTripCardSkeleton } from '@/src/ui/immo/ImmoScoutTripCard';
import { ImmoScoutDiscoveryCard } from '@/src/ui/immo/ImmoScoutDiscoveryCard';
import { 
  normalizeWishForCard, 
  normalizeTripForCard, 
  normalizeDiscoveryForCard 
} from '@/src/ui/immo/immoAdapters';

// 🔍 診斷：確認所有導入完成
console.log('[HomeScreen] All imports completed');

// ============================================
// 🔍 Release Crash 診斷：模塊頂層安全檢查
// ============================================
// 在組件外檢查所有可能 undefined 的導入
const _checkImport = (name: string, fn: any) => {
  if (typeof fn !== 'function') {
    console.error(`[HomeScreen] CRITICAL: ${name} is not a function, got:`, typeof fn);
    return false;
  }
  return true;
};

// 診斷標記：如果任何導入失敗，記錄到 console
if (!__DEV__) {
  console.log('[HomeScreen] Checking imports...');
  _checkImport('normalizeWishForCard', normalizeWishForCard);
  _checkImport('normalizeTripForCard', normalizeTripForCard);
  _checkImport('normalizeDiscoveryForCard', normalizeDiscoveryForCard);
  _checkImport('formatDateRange', formatDateRange);
  _checkImport('getWishes', getWishes);
  _checkImport('getTrips', getTrips);
  _checkImport('getDiscoveries', getDiscoveries);
  _checkImport('startChat', startChat);
  console.log('[HomeScreen] Import check complete');
}

// ============================================
// 🛡️ Safe Wrappers：確保函式存在，否則使用 fallback
// ============================================
const safeNormalizeWishForCard = typeof normalizeWishForCard === 'function' 
  ? normalizeWishForCard 
  : (wish: any) => ({ id: wish?.id || '', title: wish?.title || '', country: '', image: '', images: [], price: 0, priceFormatted: '', userName: '', status: '', statusText: '' });

const safeNormalizeTripForCard = typeof normalizeTripForCard === 'function'
  ? normalizeTripForCard
  : (trip: any, dateRange?: string) => ({ id: trip?.id || '', destination: trip?.destination || '', description: '', dateRange: dateRange || '', ownerName: '', ownerAvatar: '', ownerInitial: '' });

const safeNormalizeDiscoveryForCard = typeof normalizeDiscoveryForCard === 'function'
  ? normalizeDiscoveryForCard
  : (discovery: any) => ({ id: discovery?.id || '', title: discovery?.title || '', country: '', city: '', image: '', images: [], authorName: '', authorInitial: '', authorId: '' });

const safeFormatDateRange = typeof formatDateRange === 'function'
  ? formatDateRange
  : (startDate?: string, endDate?: string) => startDate || '';

/**
 * Home 頁面 - ImmoScout 風格 UI
 * 支援「代購（接單）模式」和「買家模式」切換
 * 
 * ⚠️ 注意：此版本僅更改 UI 呈現，不改動任何：
 * - 資料取得邏輯 (hooks, query, pagination)
 * - 權限/RLS 設定
 * - Navigation 路由結構
 * - 事件處理邏輯 (onPress, onMessagePress)
 * 
 * ============================================
 * 🔍 診斷工具（Release Crash 診斷）
 * ============================================
 * 
 * 目的：診斷 Release 模式下 "undefined is not a function" 錯誤
 * 
 * 1. Marker：確認此檔案是否為實際使用的 HomeScreen
 *    - 若看到 "HOME_SCREEN_MARKER_2026_01_14" 錯誤，表示此檔案確實在 bundle 中
 *    - 關閉方式：將下方 __DIAG_MARKER__ 設為 false
 * 
 * 2. assertFn：檢查所有被調用的函式/Hook 是否為 undefined
 *    - 若某個函式是 undefined，會立即拋出明確錯誤訊息
 *    - 錯誤訊息格式：[HomeScreen] xxx is not a function: undefined
 * 
 * 3. 使用完畢後請移除所有診斷碼
 * 
 * ============================================
 */
export default function HomeScreen() {
  // 🔍 最早期診斷：確認函式開始執行
  console.log('[HomeScreen] Function start');
  
  // ============================================
  // Release 驗證標記（僅在 Release 模式下可見）
  // ============================================
  if (!__DEV__) {
    console.log('[HomeScreen] RELEASE_BUILD_2026_01_16 - HomeScreen loaded successfully');
  }
  
  // Expo Router - 使用 useRouter hook 取得 router 實例
  console.log('[HomeScreen] Before useRouter');
  const router = useRouter();
  console.log('[HomeScreen] After useRouter, router:', typeof router);
  
  // ============================================
  // 原有邏輯開始
  // ============================================
  // console.count('SCREEN_RENDER:index'); // 暫時移除，避免可能的問題
  
  // ============================================
  // 模式狀態（預設為代購模式，與網站一致）
  // ============================================
  console.log('[HomeScreen] Before useState');
  const [mode, setMode] = useState<Mode>('shopper');
  console.log('[HomeScreen] After useState, mode:', mode);
  
  // ✅ 包裝 setMode，避免 Release 模式下 useState setter 引用問題
  const handleModeChange = useCallback((newMode: Mode) => {
    if (typeof setMode === 'function') {
      setMode(newMode);
    } else {
      console.error('[HomeScreen] setMode is not a function:', typeof setMode);
    }
  }, []);
  
  // ============================================
  // 資料狀態（保持原有邏輯不變）
  // ============================================
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ============================================
  // UI 狀態
  // ============================================
  const [pushStatus, setPushStatus] = useState<{ granted: boolean; token: string | null; error?: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar_url?: string | null } | null>(null);
  // 搜尋狀態：分離即時值與 debounced 值，避免每次輸入都觸發重新渲染
  const [searchQueryRaw, setSearchQueryRaw] = useState(''); // 即時值，綁定到 TextInput
  const [searchQuery, setSearchQuery] = useState(''); // debounced 值，用於實際搜尋
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [messageLoading, setMessageLoading] = useState<string | null>(null);
  const [isQuickWishVisible, setQuickWishVisible] = useState(false);
  const [activeFilterChips, setActiveFilterChips] = useState<string[]>([]);

  // ============================================
  // 根據模式獲取當前資料
  // ============================================
  const currentData = mode === 'shopper' ? wishes : trips;
  const isLoading = loading && currentData.length === 0;

  // ============================================
  // Discoveries 顯示條件判斷（只在 Trip feed / Buyer 模式顯示）
  // ============================================
  const isTripTab = (mode === 'buyer'); // buyer mode = Trip feed

  // ============================================
  // 獲取需求列表（保持原有邏輯不變）
  // ============================================
  const fetchWishes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        if (wishes.length === 0) {
          setLoading(true);
        }
      }
      setError(null);
      
      const statusValue = filters.status;
      let finalStatus: any = undefined;
      if (statusValue && statusValue !== 'all') {
        finalStatus = statusValue;
      }
      
      const queryOptions = {
        keyword: searchQuery.trim() || undefined,
        country: filters.country,
        category: filters.category,
        status: finalStatus,
        sortBy: filters.sortBy,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        isUrgent: filters.isUrgent,
      };
      
      const data = await getWishes(queryOptions);
      setWishes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[HomeScreen] fetchWishes error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filters]);

  // ============================================
  // 獲取旅途發現列表（保持原有邏輯不變）
  // ============================================
  const fetchDiscoveries = useCallback(async (isRefresh = false) => {
    try {
      // ✅ 允許未登入也能讀取 discoveries（RLS policy 已允許 anon 讀取）
      if (isRefresh) {
        setRefreshing(true);
      } else {
        // ✅ 修復：使用函數式更新，避免依賴 discoveries.length
        setLoading((prev) => {
          if (prev) return prev; // 如果已經在 loading，不重複設定
          return true;
        });
      }
      setError(null);
      
      const data = await getDiscoveries({ limit: 10 });
      // Debug log（驗收後可移除）
      console.log("[Discoveries] fetched:", data?.length, "error:", null);
      setDiscoveries(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[HomeScreen] fetchDiscoveries error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // ✅ 修復：移除 discoveries.length 依賴，避免無限循環

  // ============================================
  // 獲取行程列表（保持原有邏輯不變）
  // ============================================
  const fetchTrips = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        if (trips.length === 0) {
          setLoading(true);
        }
      }
      setError(null);
      
      // 注意：filters.sortBy 是 wishes 的类型 ('newest' | 'price_low' | 'price_high')
      // 但 getTrips 需要 trips 的类型 ('newest' | 'date_asc' | 'date_desc')
      // 这里只处理 'newest'，其他值忽略
      const queryOptions: {
        keyword?: string;
        sortBy?: 'newest' | 'date_asc' | 'date_desc';
      } = {
        keyword: searchQuery.trim() || undefined,
        sortBy: filters.sortBy === 'newest' ? 'newest' : undefined,
      };
      
      const data = await getTrips(queryOptions);
      setTrips(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[HomeScreen] fetchTrips error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filters]);

  // ============================================
  // 根據模式獲取資料
  // ============================================
  const fetchData = async (isRefresh = false) => {
    if (mode === 'shopper') {
      await fetchWishes(isRefresh);
    } else {
      await fetchTrips(isRefresh);
    }
  };

  // ============================================
  // Effects（保持原有邏輯不變）
  // ============================================
  useEffect(() => {
    loadPushStatus();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (mode === 'shopper') {
      fetchWishes(false);
    } else {
      fetchTrips(false);
    }
    fetchDiscoveries(false);
  }, [mode, fetchWishes, fetchTrips, fetchDiscoveries]);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'shopper') {
        fetchWishes(false);
      } else {
        fetchTrips(false);
      }
      fetchDiscoveries(false);
    }, [mode, fetchWishes, fetchTrips, fetchDiscoveries])
  );

  const loadCurrentUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      // 載入 profile 資料（包含 avatar_url）
      try {
        const profile = await getCurrentProfile();
        if (profile) {
          setUserProfile({
            name: profile.name || profile.display_name,
            avatar_url: profile.avatar_url,
          });
        }
      } catch (profileError) {
        console.warn('[HomeScreen] Failed to load profile:', profileError);
        // 即使 profile 載入失敗，也不影響其他功能
      }

      // 確保 session 存在後才註冊 push token
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const pushServiceModule = await import('@/src/lib/pushService');
          // ✅ 防護：確保模組和函數存在
          if (pushServiceModule && typeof pushServiceModule.registerPushTokenToSupabase === 'function') {
            await pushServiceModule.registerPushTokenToSupabase();
            console.log('[HomeScreen] Push token re-registered for logged-in user');
          } else {
            console.warn('[HomeScreen] registerPushTokenToSupabase not found in module');
          }
        }
      } catch (pushError) {
        console.warn('[HomeScreen] Failed to re-register push token:', pushError);
      }
    } else {
      setUserProfile(null);
    }
  };

  const loadPushStatus = async () => {
    const status = await getNotificationPermission();
    setPushStatus(status);
  };

  // ============================================
  // 通知功能（背景執行，不顯示 UI）
  // ============================================

  // 1. 確保通知 Handler 已設定（前台顯示通知）
  // 注意：通知 handler 已在 src/lib/push.ts 中統一設定，這裡不需要重複設定
  // 如果需要在這裡設定，請確保與 push.ts 中的邏輯一致（包含未讀數更新）

  // 2. 請求通知權限並獲取 Token（背景執行）
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'web') {
        return;
      }

      try {
        // 檢查現有權限狀態
        const existingStatus = await Notifications.getPermissionsAsync();

        // 如果權限不是 'granted'，則請求權限
        if (existingStatus.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        // 如果權限已授予，嘗試取得 Expo Push Token
        const finalStatus = await Notifications.getPermissionsAsync();
        if (finalStatus.status === 'granted') {
          try {
            const ConstantsModule = await import('expo-constants');
            // ✅ 防護：確保模組存在
            if (!ConstantsModule || !ConstantsModule.default) {
              console.warn('[HomeScreen] expo-constants module not loaded properly');
              return;
            }
            const projectId = ConstantsModule.default.expoConfig?.extra?.eas?.projectId as string | undefined;
            
            if (!projectId) {
              console.error('[HomeScreen] No projectId found in app.json');
              return;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const token = tokenData.data;
            
            // 上傳 Token 到 Server（非阻塞）
            try {
              const pushTokenModule = await import('@/src/lib/pushToken');
              // ✅ 防護：確保模組和函數存在
              if (pushTokenModule && typeof pushTokenModule.registerPushTokenToServer === 'function') {
                pushTokenModule.registerPushTokenToServer(token)
                  .then((success) => {
                    if (success) {
                      console.log('[HomeScreen] Token uploaded to server successfully');
                    }
                  })
                  .catch((error) => {
                    console.warn('[HomeScreen] Token upload error:', error);
                  });
              } else {
                console.warn('[HomeScreen] registerPushTokenToServer not found in module');
              }
            } catch (importError) {
              console.warn('[HomeScreen] Failed to import registerPushTokenToServer:', importError);
            }
          } catch (tokenError: any) {
            console.error('[HomeScreen] Error getting Expo Push Token:', tokenError);
          }
        }
      } catch (error: any) {
        console.error('[HomeScreen] Error in permission request flow:', error);
      }
    };
    
    requestPermission();
  }, []);


  // ============================================
  // Event Handlers（保持原有邏輯不變）
  // ============================================
  const handleRefresh = () => {
    fetchData(true);
  };

  const handleRetry = () => {
    fetchData();
  };

  const handleWishPress = useCallback((wishId: string) => {
    router.push(`/wish/${wishId}` as any);
  }, [router]);

  const handleTripPress = useCallback((tripId: string) => {
    router.push(`/trip/${tripId}` as any);
  }, [router]);

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


  // Debounce 搜索查詢
  // Debounce 搜尋輸入（300ms），避免每次輸入都觸發重新渲染
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchQueryRaw);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQueryRaw]);

  // 只在 debounced searchQuery 改變時重新 fetch
  useEffect(() => {
    if (mode === 'shopper') {
      fetchWishes(false);
    } else {
      fetchTrips(false);
    }
  }, [mode, searchQuery, filters, fetchWishes, fetchTrips]);

  const filteredData = useMemo(() => {
    // 確保返回的是數組，避免 Release 模式下 undefined 錯誤
    return Array.isArray(currentData) ? currentData : [];
  }, [currentData]);

  const handleFilterPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterModalVisible(true);
  }, []);

  const handleFilterApply = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
    if (mode === 'shopper') {
      fetchWishes(true);
    } else {
      fetchTrips(true);
    }
  }, [mode, fetchWishes, fetchTrips]);

  const handleFilterClear = useCallback(() => {
    setFilters({});
    setFilterModalVisible(false);
    if (mode === 'shopper') {
      fetchWishes(true);
    } else {
      fetchTrips(true);
    }
  }, [mode, fetchWishes, fetchTrips]);

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user) {
      router.push('/(tabs)/profile');
    } else {
      router.push('/login');
    }
  };

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

  const handleDiscoveryPress = useCallback((discoveryId: string) => {
    router.push(`/discovery/${discoveryId}`);
  }, [router]);

  // 處理「我有興趣」按鈕點擊（直接跳私訊作者）
  // 處理「我有興趣」按鈕點擊（直接跳私訊作者）
  const handleDiscoveryInterestPress = useCallback(async (discovery: Discovery) => {
    try {
      // 檢查登入狀態
      const user = await getCurrentUser();
      if (!user) {
        // 未登入：提示並導向登入頁
        Alert.alert(
          '請先登入',
          '登入後才能私訊作者',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '前往登入', 
              onPress: () => router.push('/login')
            },
          ]
        );
        return;
      }

      // 檢查是否為自己的 discovery
      if (user.id === discovery.user_id) {
        Alert.alert('提示', '不能私訊自己');
        return;
      }

      // 使用 startChat 開啟與作者的對話
      const result = await startChat(
        discovery.user_id, // 作者的 user_id
        'direct', // sourceType
        discovery.id, // sourceId（可選）
        discovery.title // sourceTitle（可選）
      );

      if (!result.success) {
        // 錯誤處理（startChat 內部已處理大部分情況）
        if (result.error) {
          Alert.alert('無法開啟對話', result.error);
        }
      }
    } catch (error: any) {
      console.error('[HomeScreen] handleDiscoveryInterestPress error:', error);
      Alert.alert('錯誤', '開啟對話失敗，請稍後再試');
    }
  }, []);

  const handleFilterChipPress = useCallback((chipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilterChips(prev => 
      prev.includes(chipId) 
        ? prev.filter(id => id !== chipId)
        : [...prev, chipId]
    );
    // 打開 filter modal 讓用戶設定詳細條件
    setFilterModalVisible(true);
  }, []);

  // ============================================
  // DiscoveriesSection - 提取的 UI 組件
  // ============================================
  const DiscoveriesSection = ({ visible, data }: { visible: boolean; data: Discovery[] }) => {
    // 如果不可見，直接返回 null（不渲染）
    if (!visible) {
      return null;
    }

    // 如果沒有資料，也不渲染
    if (!data || data.length === 0) {
      return null;
    }

    return (
      <View style={{ marginBottom: 24 }}>
        {/* Section Header - 旅途發現 */}
        <View style={immoStyles.sectionHeader}>
          <Text style={immoStyles.sectionTitle}>旅途發現</Text>
          <Text style={immoStyles.sectionSubtitle}>看看大家發現了什麼</Text>
        </View>
        
        {/* 水平 FlatList 使用新的 ImmoScoutDiscoveryCard */}
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={immoStyles.discoveriesHorizontalContent}
          keyExtractor={(item, index) => {
            // 防禦性編程：確保 item 和 item.id 存在
            if (!item) {
              console.warn('[HomeScreen] DiscoveriesSection keyExtractor: item is undefined at index', index);
              return `discovery-fallback-${index}`;
            }
            return item.id || `discovery-fallback-${index}`;
          }}
          renderItem={({ item, index }) => {
            try {
              // 防禦性編程：確保 item 存在
              if (!item) {
                console.warn('[HomeScreen] DiscoveriesSection renderItem: item is undefined at index', index);
                return null;
              }
              
              // SAFETY CHECK: 防止 normalizeDiscoveryForCard 未定義
              if (typeof normalizeDiscoveryForCard !== 'function') {
                console.error('[HomeScreen] normalizeDiscoveryForCard is not a function');
                return null;
              }

              const cardWidth = Dimensions.get('window').width * 0.85;
              const cardMargin = 16;
              return (
                <View style={[immoStyles.discoveryCardWrapper, { width: cardWidth, marginRight: cardMargin }]}>
                  <ImmoScoutDiscoveryCard
                    display={safeNormalizeDiscoveryForCard(item)}
                    onPress={() => router.push(`/discovery/${item.id}`)}
                    onInterestPress={async () => {
                      // 使用現有的 handleDiscoveryInterestPress 邏輯
                      await handleDiscoveryInterestPress(item);
                    }}
                    currentUserId={user?.id}
                  />
                </View>
              );
            } catch (error) {
              console.error('[HomeScreen] DiscoveriesSection renderItem error:', error);
              return null;
            }
          }}
          decelerationRate="fast"
          snapToInterval={Dimensions.get('window').width * 0.85 + 16}
          snapToAlignment="start"
        />
      </View>
    );
  };

  // ============================================
  // renderItem - 使用新 ImmoScout 風格卡片
  // ============================================
  const renderItem = useCallback(({ item, index }: { item: Wish | Trip; index: number }) => {
    try {
      // 防禦性編程：確保 item 存在，避免 Release 模式下 undefined 錯誤
      if (!item) {
        console.warn('[HomeScreen] renderItem: item is undefined at index', index);
        return null;
      }
      
      if (mode === 'shopper') {
        const wish = item as Wish;
        
        // SAFETY CHECK: 防止 normalizeWishForCard 未定義導致崩潰
        if (typeof normalizeWishForCard !== 'function') {
          console.error('[HomeScreen] normalizeWishForCard is not a function');
          return null;
        }

        // 使用 UI 層適配器轉換資料
        const display = safeNormalizeWishForCard({
          id: wish.id,
          title: wish.title,
          targetCountry: wish.targetCountry,
          images: wish.images,
          budget: wish.budget,
          price: wish.price,
          commission: wish.commission,
          buyer: wish.buyer,
          status: wish.status,
        });
        
        return (
          <ImmoScoutWishCard
            display={display}
            onPress={() => handleWishPress(wish.id)}
            onMessagePress={() => handleWishMessagePress(wish)}
            isLoading={messageLoading === wish.id}
          />
        );
      } else {
        const trip = item as Trip;
        
        // SAFETY CHECK: 防止 normalizeTripForCard 未定義導致崩潰
        if (typeof normalizeTripForCard !== 'function') {
          console.error('[HomeScreen] normalizeTripForCard is not a function');
          return null;
        }

        // 使用 UI 層適配器轉換資料
        const display = safeNormalizeTripForCard(
          {
            id: trip.id,
            destination: trip.destination,
            description: trip.description,
            startDate: trip.startDate,
            endDate: trip.endDate,
            owner: trip.owner,
          },
          safeFormatDateRange(trip.startDate, trip.endDate)
        );
        
        return (
          <ImmoScoutTripCard
            display={display}
            onPress={() => handleTripPress(trip.id)}
            onMessagePress={() => handleMessagePress(trip)}
            isLoading={messageLoading === trip.id}
          />
        );
      }
    } catch (error) {
      console.error('[HomeScreen] renderItem error:', error);
      return null;
    }
  }, [mode, handleWishPress, handleWishMessagePress, handleTripPress, handleMessagePress, messageLoading]);

  // ============================================
  // 渲染空狀態 - ImmoScout 風格
  // ============================================
  const renderEmpty = () => {
    if (isLoading) {
      // Skeleton loading
      return (
        <View style={immoStyles.skeletonContainer}>
          {mode === 'shopper' ? (
            <>
              <ImmoScoutWishCardSkeleton />
              <ImmoScoutWishCardSkeleton />
            </>
          ) : (
            <>
              <ImmoScoutTripCardSkeleton />
              <ImmoScoutTripCardSkeleton />
            </>
          )}
        </View>
      );
    }
    if (error) {
      return (
        <View style={immoStyles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={immoColors.textMuted} />
          <Text style={immoStyles.emptyTitle}>載入失敗</Text>
          <Text style={immoStyles.emptyText}>{error}</Text>
          <TouchableOpacity style={immoStyles.retryButton} onPress={handleRetry}>
            <Text style={immoStyles.retryButtonText}>重試</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={immoStyles.emptyContainer}>
        <Ionicons 
          name={mode === 'shopper' ? 'basket-outline' : 'airplane-outline'} 
          size={48} 
          color={immoColors.textMuted} 
        />
        <Text style={immoStyles.emptyTitle}>
          {mode === 'shopper' ? '目前沒有需求' : '目前沒有行程'}
        </Text>
        <Text style={immoStyles.emptyText}>
          {mode === 'shopper' 
            ? '試試發布你的行程，讓需要的人找到你！' 
            : '看看有沒有代購正要出國，直接私訊問問'}
        </Text>
      </View>
    );
  };

  // ============================================
  // 渲染 Header - ImmoScout 風格
  // 使用 useMemo 穩定 ListHeaderComponent，避免每次 render 都重新創建導致 TextInput 失焦
  // 根因：原本 renderHeader 是函數，每次 render 都會重新創建，導致 FlatList 的 ListHeaderComponent 重新 mount
  // 注意：useMemo 返回 JSX 元素，可以直接用作 ListHeaderComponent
  // ============================================
  const renderHeader = useMemo(() => {
    const sectionTitle = mode === 'shopper' ? '熱門需求' : '最新行程';
    const sectionSubtitle = mode === 'shopper' ? '正在找代購的需求' : '即將出發的代購行程';

    return (
      <View style={immoStyles.headerContainer}>
        {/* Role Switch */}
        <View style={immoStyles.roleSwitchContainer}>
          <RoleSwitch mode={mode} onChange={handleModeChange} />
        </View>
        
        {/* Hero Banner */}
        {/* 代購（shopper）：橘色 | 買家（buyer）：藍色 */}
        <HeroBanner
          title={mode === 'shopper' ? '開始接單賺錢' : '快速找到代購'}
          subtitle={mode === 'shopper' 
            ? '發布你的行程，讓需要的人直接私訊你' 
            : '看看誰近期要出國，直接私訊問能不能幫買'}
          buttonText={mode === 'shopper' ? '發布行程' : '發布需求'}
          onButtonPress={() => router.push(mode === 'shopper' ? '/trip/create' : '/create')}
          variant={mode === 'shopper' ? 'orange' : 'blue'}
        />

        {/* Stable SearchBar - 使用穩定的搜尋元件避免鍵盤收起 */}
        {/* 買家模式：隱藏 filter button；代購模式：顯示 filter button */}
        <StableSearchBar
          value={searchQueryRaw}
          onChangeText={setSearchQueryRaw}
          placeholder={mode === 'shopper' ? '搜尋商品、關鍵字、目的地…' : '搜尋目的地、城市、日期…'}
          onFilterPress={handleFilterPress}
          showFilter={mode !== 'buyer'}
        />

        {/* Filter Chips */}
        {/* 買家模式：隱藏 filter chips；代購模式：顯示 filter chips */}
        {mode !== 'buyer' && (
          <ImmoScoutFilterChips
            chips={defaultFilterChips}
            activeChipIds={activeFilterChips}
            onChipPress={handleFilterChipPress}
          />
        )}

        {/* Discoveries Section - 只在 Trip feed (buyer mode) 顯示 */}
        <DiscoveriesSection visible={isTripTab} data={discoveries} />

        {/* Section 分隔與間距 */}
        <View style={immoStyles.sectionDivider} />

        {/* Section Header - 最新行程 */}
        <View style={immoStyles.sectionHeader}>
          <Text style={immoStyles.sectionTitle}>{sectionTitle}</Text>
          <Text style={immoStyles.sectionSubtitle}>{sectionSubtitle}</Text>
        </View>
      </View>
    );
  }, [mode, searchQueryRaw, activeFilterChips, discoveries, isTripTab, handleFilterPress, handleFilterChipPress, handleModeChange]);

  // ============================================
  // Main Render
  // ============================================
  return (
    <Screen style={immoStyles.screen}>
      <TopBar
        userEmail={user?.email}
        userName={userProfile?.name}
        userAvatarUrl={userProfile?.avatar_url}
        onAvatarPress={handleAvatarPress}
        mode={mode}
        showBell={false}
      />
      
      <FlatList
        // 移除 key={mode}，避免 mode 切換時整個 FlatList 重新 mount 導致 TextInput 失焦
        // 改用 extraData 來觸發重新渲染
        extraData={mode}
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          // 防禦性編程：確保 item 和 item.id 存在，避免 Release 模式下 undefined 錯誤
          if (!item) {
            console.warn('[HomeScreen] keyExtractor: item is undefined at index', index);
            return `fallback-${index}`;
          }
          return item.id || `fallback-${index}`;
        }}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={filteredData.length === 0 ? immoStyles.emptyList : immoStyles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={immoColors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={immoStyles.itemSeparator} />}
        style={immoStyles.flatList}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        initialFilters={filters}
      />

      {/* Quick Wish Modal */}
      <QuickWishModal
        visible={isQuickWishVisible}
        onClose={() => setQuickWishVisible(false)}
        onSuccess={() => {
          if (mode === 'buyer') {
            fetchTrips(true);
          } else if (mode === 'shopper') {
            fetchWishes(true);
          }
        }}
      />
    </Screen>
  );
}

// ============================================
// ImmoScout 風格 Styles
// ============================================
const immoStyles = StyleSheet.create({
  screen: {
    backgroundColor: immoColors.background,
  },
  headerContainer: {
    backgroundColor: immoColors.background,
  },
  roleSwitchContainer: {
    paddingHorizontal: immoSpacing.lg,
    paddingTop: immoSpacing.md,
    paddingBottom: immoSpacing.sm,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: immoSpacing.lg,
    paddingBottom: 120,
  },
  emptyList: {
    flexGrow: 1,
  },
  itemSeparator: {
    height: immoSpacing.md,
  },
  // Section
  sectionHeader: {
    paddingHorizontal: immoSpacing.lg,
    marginTop: immoSpacing.xl,
    marginBottom: immoSpacing.md,
  },
  sectionTitle: {
    fontSize: immoTypography.fontSize['2xl'],
    fontWeight: immoTypography.fontWeight.bold,
    color: immoColors.textPrimary,
    marginBottom: immoSpacing.xs,
  },
  sectionSubtitle: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
  },
  // Section 分隔
  sectionDivider: {
    height: immoSpacing.xl, // 至少 12~16px 間距（xl 約為 16px）
    backgroundColor: 'transparent',
  },
  // Discoveries Horizontal Carousel
  discoveriesHorizontalContent: {
    paddingHorizontal: immoSpacing.lg,
    paddingBottom: immoSpacing.md,
  },
  discoveryCardWrapper: {
    // 寬度在 renderItem 中動態設置
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: immoSpacing['2xl'],
    paddingVertical: immoSpacing['4xl'],
  },
  emptyTitle: {
    fontSize: immoTypography.fontSize.lg,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.textPrimary,
    marginTop: immoSpacing.lg,
    marginBottom: immoSpacing.sm,
  },
  emptyText: {
    fontSize: immoTypography.fontSize.base,
    color: immoColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: immoSpacing.lg,
    backgroundColor: immoColors.primary,
    paddingHorizontal: immoSpacing.xl,
    paddingVertical: immoSpacing.md,
    borderRadius: immoRadius.lg,
  },
  retryButtonText: {
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.white,
  },
  // Skeleton
  skeletonContainer: {
    paddingHorizontal: immoSpacing.lg,
    paddingVertical: immoSpacing.lg,
    gap: immoSpacing.md,
  },
  // Debug
  debugContainer: {
    margin: immoSpacing.lg,
    padding: immoSpacing.md,
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.lg,
    borderWidth: 1,
    borderColor: immoColors.border,
  },
  debugText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.textMuted,
  },
  debugErrorText: {
    fontSize: immoTypography.fontSize.sm,
    color: immoColors.error,
    marginTop: immoSpacing.xs,
  },
});

// ✅ 保留原有 styles 變數（確保可編譯，但不再使用）
const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#111827',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  flatList: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  list: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    paddingTop: 0,
    backgroundColor: '#F6F7FB',
    gap: 12,
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
  discoveriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  discoveryCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
});
