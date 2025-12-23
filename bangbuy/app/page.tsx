'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useUserMode } from '@/components/UserModeProvider';
import RoleSelectorModal from '@/components/RoleSelectorModal';
import EmptyState from '@/components/EmptyState';
// InteractiveOnboarding 已移除 - 統一使用 ProductTour
import { SearchBar, SearchEmptyState, FilterButton, FilterSheet } from '@/components/search';
import ImageCarousel from '@/components/ImageCarousel';
import { useEarlyAccess } from '@/hooks/useEarlyAccess';
import { EarlyAccessNotice } from '@/components/EarlyAccessNotice';
import { startChat } from '@/lib/chatNavigation';
import ProductTour from '@/components/onboarding/ProductTour';
import ShippingGuideBanner from '@/components/ShippingGuideBanner';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { formatDateRange } from '@/lib/dateFormat';
import { useToast } from '@/components/Toast';
import SupporterBadge from '@/components/SupporterBadge';
import SupporterPrompt from '@/components/SupporterPrompt';

// ========== 國家列表（與發布許願單一致）==========
const ALL_COUNTRIES = [
  // 熱門
  { code: 'JP', name: '日本', emoji: '🇯🇵' },
  { code: 'KR', name: '韓國', emoji: '🇰🇷' },
  { code: 'US', name: '美國', emoji: '🇺🇸' },
  { code: 'DE', name: '德國', emoji: '🇩🇪' },
  { code: 'UK', name: '英國', emoji: '🇬🇧' },
  { code: 'FR', name: '法國', emoji: '🇫🇷' },
  // 歐洲
  { code: 'IT', name: '義大利', emoji: '🇮🇹' },
  { code: 'ES', name: '西班牙', emoji: '🇪🇸' },
  { code: 'NL', name: '荷蘭', emoji: '🇳🇱' },
  { code: 'BE', name: '比利時', emoji: '🇧🇪' },
  { code: 'CH', name: '瑞士', emoji: '🇨🇭' },
  { code: 'AT', name: '奧地利', emoji: '🇦🇹' },
  { code: 'CZ', name: '捷克', emoji: '🇨🇿' },
  { code: 'PL', name: '波蘭', emoji: '🇵🇱' },
  { code: 'SE', name: '瑞典', emoji: '🇸🇪' },
  { code: 'NO', name: '挪威', emoji: '🇳🇴' },
  { code: 'DK', name: '丹麥', emoji: '🇩🇰' },
  { code: 'FI', name: '芬蘭', emoji: '🇫🇮' },
  { code: 'IE', name: '愛爾蘭', emoji: '🇮🇪' },
  { code: 'PT', name: '葡萄牙', emoji: '🇵🇹' },
  { code: 'GR', name: '希臘', emoji: '🇬🇷' },
  { code: 'HU', name: '匈牙利', emoji: '🇭🇺' },
  // 北美/大洋洲
  { code: 'CA', name: '加拿大', emoji: '🇨🇦' },
  { code: 'AU', name: '澳洲', emoji: '🇦🇺' },
  { code: 'NZ', name: '紐西蘭', emoji: '🇳🇿' },
  // 亞洲
  { code: 'TW', name: '台灣', emoji: '🇹🇼' },
  { code: 'HK', name: '香港', emoji: '🇭🇰' },
  { code: 'MO', name: '澳門', emoji: '🇲🇴' },
  { code: 'SG', name: '新加坡', emoji: '🇸🇬' },
  { code: 'TH', name: '泰國', emoji: '🇹🇭' },
  { code: 'VN', name: '越南', emoji: '🇻🇳' },
  { code: 'MY', name: '馬來西亞', emoji: '🇲🇾' },
  { code: 'ID', name: '印尼', emoji: '🇮🇩' },
  { code: 'PH', name: '菲律賓', emoji: '🇵🇭' },
  { code: 'CN', name: '中國', emoji: '🇨🇳' },
  { code: 'IN', name: '印度', emoji: '🇮🇳' },
  // 中東
  { code: 'AE', name: '阿聯酋', emoji: '🇦🇪' },
  { code: 'TR', name: '土耳其', emoji: '🇹🇷' },
];

// 國家代碼對應中文名稱的快速查表
const COUNTRY_NAME_MAP: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map(c => [c.code, c.name])
);

// ========== Debounce Hook ==========
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function HomeContent() {
  const { mode } = useUserMode();
  const router = useRouter();
  const { showToast } = useToast();
  
  // ========== 統一資料流的核心 State ==========
  const [wishes, setWishes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  // ========== 搜尋/Filter State（單一來源）==========
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<'ALL' | string>('ALL');
  const [sort, setSort] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  // 🆕 日期篩選（主要用於行程）
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce 搜尋詞（300ms）
  const debouncedSearch = useDebounce(search.trim(), 300);

  // Filter Sheet 狀態
  const [showFilter, setShowFilter] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // 🌱 早期體驗使用狀況管理
  const { state: earlyAccessState, checkContactStatus, recordContact, getNoticeMessage } = useEarlyAccess();
  const [showEarlyAccessNotice, setShowEarlyAccessNotice] = useState(false);
  const [earlyAccessNoticeType, setEarlyAccessNoticeType] = useState<'first_contact' | 'active_usage' | 'standard'>('standard');

  // 🔐 聊天按鈕 loading 狀態（防止連點）
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  
  // 🗑️ 刪除行程功能（需要在 fetchTrips 定義後，所以用普通函數）
  const handleDeleteTrip = async (tripId: string) => {
    if (!currentUser) return;
    
    // 確認對話框
    if (!confirm('確定要刪除這個行程嗎？\n刪除後不可復原。')) {
      return;
    }
    
    setDeletingTripId(tripId);
    
    try {
      // Optimistic UI: 立即從列表中移除
      setTrips(prev => prev.filter(t => t.id !== tripId));
      
      // 呼叫 API 刪除
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);
      
      if (error) {
        // 如果失敗，恢復列表（重新載入）
        throw error;
      }
      
      // 成功：顯示 toast
      showToast('success', '已刪除行程');
    } catch (error: any) {
      console.error('[DeleteTrip] Error:', error);
      // 失敗：重新載入列表以恢復正確狀態
      await fetchTrips({ search: debouncedSearch, country, sort, dateFrom, dateTo });
      showToast('error', error.message || '刪除失敗，請稍後再試');
    } finally {
      setDeletingTripId(null);
    }
  };

  // 🎯 產品導覽狀態
  const [showTour, setShowTour] = useState(false);

  // 計算 active filter 數量
  const activeFilterCount = (country !== 'ALL' ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const hasFilters = !!(debouncedSearch || country !== 'ALL' || dateFrom || dateTo);

  // 🎯 產品導覽觸發（首次登入後顯示）
  useEffect(() => {
    // 只在登入後、資料載入完成後檢查
    if (!currentUser || loading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Tour Trigger] 等待登入...', { hasUser: !!currentUser, loading });
      }
      return;
    }
    
    // 檢查是否已完成導覽
    const tourDone = localStorage.getItem('bb_tour_v1_done');
    if (tourDone) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Tour Trigger] 已完成導覽，不再顯示');
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Tour Trigger] 準備顯示導覽（1秒後）');
    }
    
    // 延遲顯示，確保 UI 已渲染
    const timer = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Tour Trigger] 🚀 setShowTour(true)');
      }
      setShowTour(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentUser, loading]);

  // 🧪 開發環境：暴露手動觸發教學的方法
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).__startTour = () => {
        console.log('[Tour] 手動觸發教學');
        localStorage.removeItem('bb_tour_v1_done');
        setShowTour(true);
      };
      (window as any).__resetTour = () => {
        console.log('[Tour] 重置教學狀態');
        localStorage.removeItem('bb_tour_v1_done');
        localStorage.removeItem('bangbuy_coach_mark_v2');
        console.log('[Tour] 請重整頁面');
      };
      console.log('[Tour] 開發工具已載入：__startTour() / __resetTour()');
    }
  }, []);


  // ========== fetchTrips：Server-side filtering ==========
  const fetchTrips = useCallback(async (params: { 
    search: string; 
    country: string; 
    sort: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    console.log('[fetchTrips]', params);
    
    try {
      // 🔥 查詢 trips 並 JOIN shopper profiles（代購者資訊）
      // 使用正確的 FK relationship 名稱，包含 is_supporter
      let q = supabase
        .from('trips')
        .select(`
          *,
          profiles!trips_shopper_id_fkey(id, name, avatar_url, is_supporter)
        `);

      // Country Filter：trips 表用 destination 欄位 (文字)，需要用 ilike
      if (params.country !== 'ALL') {
        const countryName = COUNTRY_NAME_MAP[params.country] || params.country;
        q = q.ilike('destination', `%${countryName}%`);
      }

      // Search Filter (server-side ilike)
      if (params.search) {
        q = q.or(`destination.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      // 🆕 日期篩選（真實後端篩選，支援日期區間）
      if (params.dateFrom) {
        // 篩選：結束日期 >= 查詢開始日期（行程結束日期要在查詢範圍內）
        q = q.or(`end_date.gte.${params.dateFrom},date.gte.${params.dateFrom}`);
      }
      if (params.dateTo) {
        // 篩選：開始日期 <= 查詢結束日期（行程開始日期要在查詢範圍內）
        q = q.or(`start_date.lte.${params.dateTo},date.lte.${params.dateTo}`);
      }

      // 🔧 修復：只用 created_at 排序（priority 可能不存在）
      q = q.order('created_at', { ascending: false });

      q = q.limit(50);

      const { data, error } = await q;

      if (error) {
        console.error('[fetchTrips] Error:', error);
        setTrips([]);
        return;
      }

      const processedTrips = (data || []).map((trip: any) => ({
        ...trip,
        // 🔥 永遠顯示 shopper 資訊，不顯示匿名
        // profiles 是 JOIN 後的資料，統一命名為 shopper，包含 is_supporter
        shopper: trip.profiles || { name: trip.shopper_name || '使用者', avatar_url: '', is_supporter: false }
      }));
      
      console.log('[fetchTrips] 結果:', processedTrips.length, '筆');
      setTrips(processedTrips);
    } catch (err) {
      console.error('[fetchTrips] Exception:', err);
      setTrips([]);
    }
  }, []);

  // ========== fetchWishes：Server-side filtering ==========
  const fetchWishes = useCallback(async (params: { 
    search: string; 
    country: string; 
    sort: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    console.log('[fetchWishes]', params);
    
    try {
      // 🔥 查詢 wish_requests 並 JOIN buyer profiles（發起者資訊）
      // 使用正確的 FK relationship 名稱，包含 is_supporter
      let q = supabase
        .from('wish_requests')
        .select(`
          *,
          profiles!wish_requests_buyer_id_fkey(id, name, avatar_url, is_supporter)
        `)
        .eq('status', 'open');

      // Country Filter (server-side)
      if (params.country !== 'ALL') {
        q = q.eq('target_country', params.country);
      }

      // Search Filter (server-side ilike)
      if (params.search) {
        q = q.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      // 🆕 日期篩選（按截止日期）
      if (params.dateFrom) {
        q = q.gte('deadline', params.dateFrom);
      }
      if (params.dateTo) {
        q = q.lte('deadline', params.dateTo);
      }

      // 🔧 修復：只用基本排序（priority 可能不存在）
      switch (params.sort) {
        case 'price_low':
          q = q.order('budget', { ascending: true });
          break;
        case 'price_high':
          q = q.order('budget', { ascending: false });
          break;
        default: // newest
          q = q.order('created_at', { ascending: false });
      }

      q = q.limit(50);

      const { data, error } = await q;

      if (error) {
        console.error('[fetchWishes] Error:', error);
        setWishes([]);
        return;
      }

      const processedWishes = (data || []).map((wish: any) => ({
        ...wish,
        // 🔥 永遠顯示 buyer 資訊，不顯示匿名
        // profiles 是 JOIN 後的資料，統一命名為 buyer，包含 is_supporter
        buyer: wish.profiles || { name: '使用者', avatar_url: '', is_supporter: false }
      }));
      
      console.log('[fetchWishes] 結果:', processedWishes.length, '筆');
      setWishes(processedWishes);
    } catch (err) {
      console.error('[fetchWishes] Exception:', err);
      setWishes([]);
    }
  }, []);

  // ========== 初始載入 User & Favorites ==========
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      try {
        const { data: userResponse, error: userError } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (!userError && userResponse?.user) {
          setCurrentUser(userResponse.user);

          // 載入收藏
          const { data: favData, error: favError } = await supabase
            .from('favorites')
            .select('wish_id')
            .eq('user_id', userResponse.user.id);

          if (!isMounted) return;

          if (favError) {
            // 📊 診斷資訊
            if (process.env.NODE_ENV === 'development') {
              console.error('[收藏] 載入收藏列表失敗', {
                error: favError.message,
                code: favError.code,
                details: favError.details,
                hint: favError.hint,
              });
            }
            // 如果是 RLS 錯誤，可能是 policies 未正確設定
            if (favError.code === '42501' || favError.message.includes('permission denied') || favError.message.includes('RLS')) {
              console.warn('🚨 [收藏] 載入失敗：RLS 權限錯誤，請檢查 favorites 表的 policies');
            }
          } else if (favData) {
            setMyFavorites(favData.map((f: any) => f.wish_id));
            if (process.env.NODE_ENV === 'development') {
              console.log('[收藏] 載入收藏列表成功', { count: favData.length });
            }
          }
        }
      } catch (err) {
        console.error('[loadUserData] Error:', err);
      }
    }

    loadUserData();

    return () => { isMounted = false; };
  }, []);

  // ========== 資料載入：依賴 debouncedSearch, country, sort, dateFrom, dateTo ==========
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchTrips({ search: debouncedSearch, country, sort, dateFrom, dateTo }),
          fetchWishes({ search: debouncedSearch, country, sort, dateFrom, dateTo }),
        ]);
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || '資料載入時發生錯誤');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => { isMounted = false; };
  }, [debouncedSearch, country, sort, dateFrom, dateTo, fetchTrips, fetchWishes]);

  // ========== 收藏功能（完整診斷版）==========
  const [favoriteLoading, setFavoriteLoading] = useState<Record<string, boolean>>({});
  
  const toggleFavorite = useCallback(async (e: React.MouseEvent, wishId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 🔐 防抖：如果正在處理中，直接返回
    if (favoriteLoading[wishId]) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[收藏] 請求進行中，忽略重複點擊');
      }
      return;
    }

    // 🔐 未登入：導向登入頁
    if (!currentUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[收藏] 未登入，導向登入頁');
      }
      router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const isFav = myFavorites.includes(wishId);
    const action = isFav ? 'remove' : 'add';

    // 📊 完整診斷資訊（開發模式）
    if (process.env.NODE_ENV === 'development') {
      console.log('═'.repeat(60));
      console.log('[收藏] 點擊收藏 - 開始');
      console.log('  操作:', action);
      console.log('  wishId:', wishId);
      console.log('  userId:', currentUser.id);
      console.log('  目前 UI 狀態 isFavorited:', isFav);
      console.log('═'.repeat(60));
    }

    // 設定 loading 狀態
    setFavoriteLoading(prev => ({ ...prev, [wishId]: true }));

    // Optimistic update
    if (isFav) {
      setMyFavorites(prev => prev.filter(id => id !== wishId));
    } else {
      setMyFavorites(prev => [...prev, wishId]);
    }

    try {
      if (isFav) {
        // 移除收藏
        const { data, error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('wish_id', wishId)
          .select(); // 加入 select 以獲取刪除的資料

        // 📊 完整診斷資訊
        if (process.env.NODE_ENV === 'development') {
          console.log('═'.repeat(60));
          console.log('[收藏] DELETE 回應');
          console.log('  data:', data);
          console.log('  error:', error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: (error as any).status,
          } : null);
          console.log('═'.repeat(60));
        }

        if (error) {
          // Rollback optimistic update
          setMyFavorites(prev => [...prev, wishId]);
          
          // 判斷根因
          if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('RLS')) {
            console.error('🚨 [收藏] 根因：RLS 權限錯誤');
            alert('權限不足，請確認您已登入且帳號狀態正常');
          } else if (error.code === 'PGRST116') {
            // 記錄不存在（可能已被刪除）
            console.log('[收藏] 記錄不存在，狀態已正確');
            // 不需要 rollback，狀態已正確
          } else {
            console.error('🚨 [收藏] 根因：其他錯誤', error);
            alert('移除收藏失敗，請稍後再試');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [收藏] 移除成功');
            console.log('  刪除的記錄數:', data?.length || 0);
          }
          
          // 成功後重新 fetch 一次確認狀態（確保同步）
          const { data: verifyData } = await supabase
            .from('favorites')
            .select('wish_id')
            .eq('user_id', currentUser.id)
            .eq('wish_id', wishId)
            .maybeSingle();
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[收藏] 驗證查詢結果:', verifyData ? '仍存在（異常）' : '已刪除（正常）');
          }
          
          // 🔥 觸發收藏列表重新載入（確保 Dashboard 同步）
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: { wishId, action: 'removed' } }));
          }
        }
      } else {
        // 新增收藏
        const { data, error } = await supabase
          .from('favorites')
          .insert([{ user_id: currentUser.id, wish_id: wishId }])
          .select(); // 加入 select 以獲取插入的資料

        // 📊 完整診斷資訊
        if (process.env.NODE_ENV === 'development') {
          console.log('═'.repeat(60));
          console.log('[收藏] INSERT 回應');
          console.log('  data:', data);
          console.log('  error:', error ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            status: (error as any).status,
          } : null);
          console.log('═'.repeat(60));
        }

        if (error) {
          // Rollback optimistic update
          setMyFavorites(prev => prev.filter(id => id !== wishId));
          
          // 判斷根因
          if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('RLS')) {
            console.error('🚨 [收藏] 根因：RLS 權限錯誤');
            alert('權限不足，請確認您已登入且帳號狀態正常');
          } else if (error.code === '23505') {
            // 重複鍵（可能已存在）
            console.log('[收藏] 已存在，同步狀態');
            setMyFavorites(prev => [...prev, wishId]);
            // 不需要 rollback，狀態已正確
          } else {
            console.error('🚨 [收藏] 根因：其他錯誤', error);
            alert('新增收藏失敗，請稍後再試');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [收藏] 新增成功');
            console.log('  插入的記錄:', data?.[0]);
          }
          
          // 成功後重新 fetch 一次確認狀態（確保同步）
          const { data: verifyData } = await supabase
            .from('favorites')
            .select('wish_id')
            .eq('user_id', currentUser.id)
            .eq('wish_id', wishId)
            .maybeSingle();
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[收藏] 驗證查詢結果:', verifyData ? '已存在（正常）' : '不存在（異常）');
          }
          
          // 如果驗證失敗，同步狀態
          if (!verifyData) {
            console.warn('[收藏] 驗證失敗，重新同步狀態');
            setMyFavorites(prev => prev.filter(id => id !== wishId));
          }
          
          // 🔥 觸發收藏列表重新載入（確保 Dashboard 同步）
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: { wishId, action: 'added' } }));
          }
        }
      }
    } catch (err: any) {
      // Rollback optimistic update
      if (isFav) {
        setMyFavorites(prev => [...prev, wishId]);
      } else {
        setMyFavorites(prev => prev.filter(id => id !== wishId));
      }
      
      console.error('🚨 [收藏] 根因：例外錯誤', err);
      alert('操作失敗，請稍後再試');
    } finally {
      // 清除 loading 狀態
      setFavoriteLoading(prev => {
        const next = { ...prev };
        delete next[wishId];
        return next;
      });
    }
  }, [currentUser, myFavorites, router, favoriteLoading]);

  // ========== 工具函數（完全不變）==========
  const getFlag = useCallback((code: string) => {
    const flags: Record<string, string> = {
      JP: '🇯🇵',
      KR: '🇰🇷',
      US: '🇺🇸',
      UK: '🇬🇧',
      TW: '🇹🇼'
    };
    return flags[code] || code;
  }, []);

  // ========== UI 渲染（統一風格，橘藍配色）==========
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 🎯 產品導覽（半透明遮罩 + 高亮 + 箭頭）*/}
      <ProductTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={() => setShowTour(false)}
        mode={mode}
      />
      
      {/* 🎯 InteractiveOnboarding 已移除 - 統一使用上方的 ProductTour */}
      
      <RoleSelectorModal />
      <Navbar />

      {/* ⭐ Supporter 橫向 Banner（可關閉）*/}
      <SupporterPrompt />

      {/* 📦 運回台灣方式提示 Banner（可關閉）*/}
      <ShippingGuideBanner />

      {/* 🌱 早期體驗溫和提示（非阻斷式 Info Banner）*/}
      <EarlyAccessNotice
        type={earlyAccessNoticeType}
        show={showEarlyAccessNotice}
        onClose={() => setShowEarlyAccessNotice(false)}
        autoHideDuration={8000}
      />

      {/* 🔐 聊天錯誤提示 Toast */}
      {chatError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {chatError}
            <button onClick={() => setChatError(null)} className="ml-2 hover:text-red-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner - 明確 32px padding */}
      <div 
        className="shadow-sm transition-all duration-200"
        style={{
          background: mode === 'requester' 
            ? 'linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))' 
            : 'linear-gradient(to right, rgb(249, 115, 22), rgb(234, 88, 12))',
          paddingTop: '32px',
          paddingBottom: '32px'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-white">
            {/* 標題 - text-2xl (24px) */}
            <h1 className="text-2xl font-bold mb-3 tracking-tight transition-opacity duration-200">
              {mode === 'requester' ? '找到可靠的代購' : '開始接單賺錢'}
            </h1>
            
            {/* 副標 - line-height 1.6 */}
            <p className="text-white/90 text-sm font-light max-w-xl mb-5 transition-opacity duration-200" style={{ lineHeight: '1.6' }}>
              {mode === 'requester' 
                ? '發布需求，輕鬆購買全球商品' 
                : '利用你的行程，幫他人代購賺收入'}
            </p>
            
            {/* CTA 按鈕 - 高度 44px */}
            <Link 
              href={mode === 'requester' ? '/create' : '/trips/create'} 
              data-tour="primary-cta"
              className={`
                inline-flex items-center gap-2 px-6 rounded-full font-semibold text-sm
                transition-all duration-200 shadow-md hover:shadow-lg
                ${mode === 'requester' 
                  ? 'bg-white text-blue-600 hover:bg-blue-50' 
                  : 'bg-white text-orange-600 hover:bg-orange-50'
                }
              `}
              style={{ height: '44px' }}
            >
              <span>{mode === 'requester' ? '發布需求' : '發布行程'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* 🔍 搜尋/篩選區塊 */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          {/* 搜尋框 + 漏斗按鈕 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-lg" data-tour="search-bar">
              <SearchBar
                value={search}
                onChange={setSearch}
                onClear={() => setSearch('')}
              />
            </div>
            
            {/* 漏斗 Filter 按鈕 */}
            <button
              type="button"
              data-tour="filter-btn"
              onClick={() => setShowFilter(!showFilter)}
              className={`
                shrink-0 h-10 px-3 rounded-xl
                flex items-center gap-2
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${showFilter || country !== 'ALL'
                  ? mode === 'requester'
                    ? 'bg-blue-500 text-white focus:ring-blue-400'
                    : 'bg-orange-500 text-white focus:ring-orange-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300'
                }
              `}
            >
              {/* 漏斗 SVG Icon */}
              <svg 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
                />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">篩選</span>
              {country !== 'ALL' && (
                <span className={`
                  w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                  ${mode === 'requester' ? 'bg-white text-blue-600' : 'bg-white text-orange-600'}
                `}>
                  1
                </span>
              )}
            </button>
          </div>

          {/* 篩選面板（表格樣式）*/}
          {showFilter && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 國家選擇 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    國家/地區
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`
                      w-full h-10 px-3 pr-8
                      bg-white border border-gray-200 rounded-lg
                      text-sm font-medium text-gray-700
                      outline-none cursor-pointer
                      transition-all duration-200
                      hover:border-gray-300
                      focus:ring-2 focus:border-transparent
                      ${mode === 'requester' 
                        ? 'focus:ring-blue-500/30 focus:border-blue-500' 
                        : 'focus:ring-orange-500/30 focus:border-orange-500'
                      }
                    `}
                    style={{ 
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '18px',
                    }}
                  >
                    <option value="ALL">🌍 全部國家</option>
                    <optgroup label="── 熱門 ──">
                      {ALL_COUNTRIES.slice(0, 6).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── 歐洲 ──">
                      {ALL_COUNTRIES.slice(6, 22).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── 北美/大洋洲 ──">
                      {ALL_COUNTRIES.slice(22, 25).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── 亞洲 ──">
                      {ALL_COUNTRIES.slice(25, 36).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── 中東 ──">
                      {ALL_COUNTRIES.slice(36).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 排序選擇 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    排序方式
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className={`
                      w-full h-10 px-3 pr-8
                      bg-white border border-gray-200 rounded-lg
                      text-sm font-medium text-gray-700
                      outline-none cursor-pointer
                      transition-all duration-200
                      hover:border-gray-300
                      focus:ring-2 focus:border-transparent
                      ${mode === 'requester' 
                        ? 'focus:ring-blue-500/30 focus:border-blue-500' 
                        : 'focus:ring-orange-500/30 focus:border-orange-500'
                      }
                    `}
                    style={{ 
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '18px',
                    }}
                  >
                    <option value="newest">⏰ 最新發布</option>
                    <option value="price_low">💰 價格：低到高</option>
                    <option value="price_high">💰 價格：高到低</option>
                  </select>
                </div>

                {/* 🆕 日期篩選 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    {mode === 'requester' ? '行程日期（從）' : '截止日期（從）'}
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`
                      w-full h-10 px-3
                      bg-white border border-gray-200 rounded-lg
                      text-sm font-medium text-gray-700
                      outline-none cursor-pointer
                      transition-all duration-200
                      hover:border-gray-300
                      focus:ring-2 focus:border-transparent
                      ${mode === 'requester' 
                        ? 'focus:ring-blue-500/30 focus:border-blue-500' 
                        : 'focus:ring-orange-500/30 focus:border-orange-500'
                      }
                    `}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    {mode === 'requester' ? '行程日期（到）' : '截止日期（到）'}
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`
                      w-full h-10 px-3
                      bg-white border border-gray-200 rounded-lg
                      text-sm font-medium text-gray-700
                      outline-none cursor-pointer
                      transition-all duration-200
                      hover:border-gray-300
                      focus:ring-2 focus:border-transparent
                      ${mode === 'requester' 
                        ? 'focus:ring-blue-500/30 focus:border-blue-500' 
                        : 'focus:ring-orange-500/30 focus:border-orange-500'
                      }
                    `}
                  />
                </div>
              </div>

              {/* 快速清除按鈕 */}
              {(country !== 'ALL' || sort !== 'newest' || dateFrom || dateTo) && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setCountry('ALL'); setSort('newest'); setDateFrom(''); setDateTo(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ✕ 重置篩選
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Filter 提示（篩選面板收起時顯示）*/}
          {!showFilter && hasFilters && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {debouncedSearch && (
                <span className={`
                  px-2 py-1 rounded-full flex items-center gap-1
                  ${mode === 'requester' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                `}>
                  🔍 {debouncedSearch}
                  <button onClick={() => setSearch('')} className="hover:opacity-70">×</button>
                </span>
              )}
              {country !== 'ALL' && (
                <span className={`
                  px-2 py-1 rounded-full flex items-center gap-1
                  ${mode === 'requester' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                `}>
                  {ALL_COUNTRIES.find(c => c.code === country)?.emoji} {COUNTRY_NAME_MAP[country] || country}
                  <button onClick={() => setCountry('ALL')} className="hover:opacity-70">×</button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span className={`
                  px-2 py-1 rounded-full flex items-center gap-1
                  ${mode === 'requester' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
                `}>
                  📅 {dateFrom || '...'} ~ {dateTo || '...'}
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="hover:opacity-70">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearch(''); setCountry('ALL'); setSort('newest'); setDateFrom(''); setDateTo(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                清除全部
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Feed Container - 增加上下間距，營造呼吸空間 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        
        {/* Error Message - 統一風格 */}
        {error && (
          <div className="bg-white rounded-xl p-5 mb-6 border border-red-100 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">載入失敗</h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-sm bg-orange-500 text-white px-5 py-2 rounded-full font-semibold hover:bg-orange-600 transition"
                >
                  重新載入
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Header - 降低視覺重量 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1.5">
            {mode === 'requester' ? '最新行程' : '熱門需求'}
          </h2>
          <p className="text-sm text-gray-500 font-light">
            {mode === 'requester' ? '即將出發的代購行程' : '可接單的代購需求'}
          </p>
        </div>

        {/* Loading State - 降低視覺重量 */}
        {loading ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse border border-gray-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gray-100"></div>
                  <div className="flex-1">
                    <div className="h-3.5 bg-gray-100 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-5 bg-gray-100 rounded w-2/3 mb-3"></div>
                <div className="h-3.5 bg-gray-100 rounded w-full mb-2"></div>
                <div className="h-3.5 bg-gray-100 rounded w-4/5"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Requester Mode - Trips Feed */}
            {mode === 'requester' ? (
              // 搜尋無結果
              hasFilters && trips.length === 0 ? (
                <SearchEmptyState 
                  query={debouncedSearch} 
                  hasFilters={activeFilterCount > 0}
                  onClearQuery={() => setSearch('')}
                  onClearFilters={() => setCountry('ALL')}
                  onClearAll={() => { setSearch(''); setCountry('ALL'); setSort('newest'); }}
                />
              ) : !hasFilters && trips.length === 0 ? (
                <EmptyState
                  icon="✈️"
                  title="目前沒有代購行程"
                  description="還沒有代購者發布行程，你可以先發布需求，等待代購者聯繫你"
                  actionLabel="探索功能"
                  actionHref="/trips"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {trips.map((trip) => (
                    <div 
                      key={trip.id}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100"
                      style={{ padding: '24px' }}
                    >
                      {/* Card Header - 使用者名稱與日期：次要層級 */}
                      <div className="flex items-start justify-between" style={{ marginBottom: '20px' }}>
                        <Link 
                          href={`/profile/${trip.shopper_id}`}
                          className="flex items-center gap-3 hover:opacity-75 transition group"
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium shadow-sm">
                            {trip.shopper?.avatar_url ? (
                              <img src={trip.shopper.avatar_url} className="w-full h-full rounded-full object-cover" alt=""/>
                            ) : (
                              <span style={{ fontSize: '13px' }}>{trip.shopper_name?.[0] || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-gray-500 group-hover:text-gray-700 transition" style={{ fontSize: '13px' }}>
                                {trip.shopper_name || trip.shopper?.name || '使用者'}
                              </p>
                              {trip.shopper?.is_supporter && (
                                <SupporterBadge size="small" />
                              )}
                            </div>
                            <p className="text-gray-400 font-light" style={{ fontSize: '11px' }}>代購夥伴</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg border border-gray-200" style={{ fontSize: '12px' }}>
                            {formatDateRange(trip.start_date, trip.end_date, trip.date)}
                          </span>
                          {/* 刪除按鈕（只有擁有者可見） */}
                          {currentUser && trip.shopper_id === currentUser.id && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteTrip(trip.id);
                              }}
                              disabled={deletingTripId === trip.id}
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="刪除行程"
                              style={{ padding: '4px' }}
                            >
                              {deletingTripId === trip.id ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Content - 地點：主視覺 */}
                      <div style={{ marginBottom: '20px' }}>
                        <h3 className="text-xl font-bold text-gray-900" style={{ marginBottom: '12px' }}>
                          前往 {trip.destination}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 font-light" style={{ lineHeight: '1.6' }}>
                          {trip.description}
                        </p>
                      </div>

                      {/* Card Actions - 私訊按鈕：藍色實心，高度 44px */}
                      <div className="flex items-center justify-between border-t border-gray-100" style={{ paddingTop: '16px' }}>
                        <div className="text-xs text-gray-400 font-light">
                          <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          聯繫代購
                        </div>
                        <button 
                          disabled={chatLoadingId === `trip:${trip.id}`}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const targetUserId = trip.shopper_id;
                            const buttonId = `trip:${trip.id}`;
                            
                            if (!targetUserId) {
                              setChatError('無法開啟聊天：代購者 ID 無效');
                              return;
                            }

                            // 防止連點
                            if (chatLoadingId) return;
                            setChatLoadingId(buttonId);
                            setChatError(null);

                            try {
                              // 🌱 早期體驗：檢查聯繫狀態（不阻斷）
                              const contactCheck = await checkContactStatus(targetUserId);
                              if (contactCheck.showNotice) {
                                setEarlyAccessNoticeType(contactCheck.showNotice);
                                setShowEarlyAccessNotice(true);
                              }

                              // 🔐 使用 get-or-create 獲取對話 ID（冪等性）
                              const result = await startChat({
                                targetUserId,
                                sourceType: 'trip',
                                sourceId: trip.id,
                                sourceTitle: trip.destination || '',
                              });

                              // 🔐 未登入：導向登入頁
                              if (result.requireLogin && result.loginRedirectUrl) {
                                router.push(result.loginRedirectUrl);
                                setChatLoadingId(null);
                                return;
                              }

                              if (!result.success || !result.url) {
                                setChatError(result.error || '無法建立對話，請稍後再試');
                                setChatLoadingId(null);
                                return;
                              }

                              // 記錄已發起聯繫
                              await recordContact(targetUserId);

                              // 導向聊天室（使用 conversation ID）
                              router.push(result.url);
                            } catch (err: any) {
                              console.error('[私訊按鈕] Error:', err);
                              setChatError('發生錯誤，請稍後再試');
                              setChatLoadingId(null);
                            }
                          }}
                          className={`
                            rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md
                            ${chatLoadingId === `trip:${trip.id}` 
                              ? 'bg-blue-300 cursor-not-allowed' 
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }
                          `}
                          style={{ 
                            height: '44px',
                            paddingLeft: '20px',
                            paddingRight: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '14px',
                            gap: '8px'
                          }}
                        >
                          {chatLoadingId === `trip:${trip.id}` ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="text-white">處理中...</span>
                            </>
                          ) : (
                            '私訊'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Shopper Mode - Wishes Feed */
              // 搜尋無結果
              hasFilters && wishes.length === 0 ? (
                <SearchEmptyState 
                  query={debouncedSearch}
                  hasFilters={activeFilterCount > 0}
                  onClearQuery={() => setSearch('')}
                  onClearFilters={() => setCountry('ALL')}
                  onClearAll={() => { setSearch(''); setCountry('ALL'); setSort('newest'); }}
                />
              ) : !hasFilters && wishes.length === 0 ? (
                <EmptyState
                  icon="🎁"
                  title="目前沒有代購需求"
                  description="還沒有買家發布需求，你可以先探索其他功能，或等待新需求出現"
                  actionLabel="發布第一個需求"
                  actionHref="/create"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7">
                  {wishes.map((wish) => {
                    // 🎨 純 UI：模擬狀態（之後可從真實資料讀取）
                    const mockStatus = wish.status || 'pending';
                    const getStatusStyle = (status: string) => {
                      switch(status) {
                        case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
                        case 'done': return 'bg-orange-100 text-orange-700 border-orange-200';
                        default: return 'bg-gray-100 text-gray-600 border-gray-200';
                      }
                    };
                    const getStatusText = (status: string) => {
                      switch(status) {
                        case 'in_progress': return '進行中';
                        case 'done': return '已完成';
                        default: return '待處理';
                      }
                    };

                    return (
                    <div 
                      key={wish.id} 
                      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full border border-gray-100 hover:border-orange-200"
                    >
                      {/* Card Image - 使用 ImageCarousel */}
                      <div className="relative">
                        <ImageCarousel 
                          images={wish.images || []} 
                          alt={wish.title}
                          aspectRatio="4/3"
                          showCounter={wish.images?.length > 1}
                        />
                        {/* 收藏按鈕 - 圖片右上角 */}
                        <button 
                          onClick={(e) => toggleFavorite(e, wish.id)}
                          disabled={favoriteLoading[wish.id]}
                          className={`absolute top-3 right-12 z-10 p-2.5 rounded-full backdrop-blur-md transition-all ${
                            favoriteLoading[wish.id]
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          } ${
                            myFavorites.includes(wish.id)
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500 shadow-md'
                          }`}
                        >
                          <svg className="w-5 h-5" fill={myFavorites.includes(wish.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        {/* 國家標籤 - 圖片左上角 */}
                        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-orange-700 text-xs font-bold rounded-full shadow-md flex items-center gap-1.5">
                          <span className="text-base">{getFlag(wish.target_country)}</span>
                          <span>{wish.target_country}</span>
                        </div>
                      </div>

                      {/* 文字區塊用 Link 包起來 */}
                      <Link href={`/wish/${wish.id}`} className="block p-5">
                        {/* Card Header - 次要資訊灰階化 */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium shadow-sm shrink-0">
                              {wish.buyer?.avatar_url ? (
                                <img 
                                  src={`${wish.buyer.avatar_url}?v=${wish.buyer.avatar_url.split('/').pop() || Date.now()}`} 
                                  className="w-full h-full rounded-full object-cover" 
                                  alt=""
                                />
                              ) : (
                                <span className="text-xs">{wish.buyer?.name?.[0]}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium text-gray-700 truncate">{wish.buyer?.name || '使用者'}</p>
                                  {wish.buyer?.is_supporter && (
                                    <SupporterBadge size="small" />
                                  )}
                                </div>
                                {/* 🔥 評價系統暫時關閉（Beta 階段） */}
                              </div>
                              <p className="text-[10px] text-gray-500 font-light">需要幫助</p>
                            </div>
                          </div>
                          {/* 狀態標籤 - 降低視覺重量 */}
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded border shrink-0 ${getStatusStyle(mockStatus)}`}>
                            {getStatusText(mockStatus)}
                          </span>
                        </div>

                        {/* Card Title - 主要焦點 */}
                        <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
                          {wish.title}
                        </h3>

                        {/* 價格 */}
                        <div className="flex items-baseline gap-1.5 pt-3 border-t border-gray-100">
                          <span className="text-xs font-medium text-gray-500">NT$</span>
                          <span className="text-2xl font-bold text-orange-600">
                            {Number(wish.budget).toLocaleString()}
                          </span>
                        </div>
                      </Link>
                      
                      {/* 🎯 私訊接單按鈕 - 放在 Link 外面 */}
                      <div className="px-5 pb-5">
                        <button
                          disabled={chatLoadingId === `wish:${wish.id}`}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 檢查 buyer_id 是否有效
                            const targetUserId = wish.buyer_id;
                            const buttonId = `wish:${wish.id}`;
                            const isValidUUID = targetUserId && 
                                             targetUserId !== '00000000-0000-0000-0000-000000000000' &&
                                             targetUserId.length > 10;
                            
                            if (!isValidUUID) {
                              console.error('❌ buyer_id 無效或為全 0 UUID:', targetUserId);
                              setChatError('無法開啟聊天：發布者 ID 無效');
                              return;
                            }

                            // 防止連點
                            if (chatLoadingId) return;
                            setChatLoadingId(buttonId);
                            setChatError(null);

                            try {
                              // 🌱 早期體驗：檢查聯繫狀態（不阻斷）
                              const contactCheck = await checkContactStatus(targetUserId);
                              if (contactCheck.showNotice) {
                                setEarlyAccessNoticeType(contactCheck.showNotice);
                                setShowEarlyAccessNotice(true);
                              }

                              // 🔐 使用 get-or-create 獲取對話 ID（冪等性）
                              const result = await startChat({
                                targetUserId,
                                sourceType: 'wish_request',
                                sourceId: wish.id,
                                sourceTitle: wish.title || '',
                              });

                              // 🔐 未登入：導向登入頁
                              if (result.requireLogin && result.loginRedirectUrl) {
                                router.push(result.loginRedirectUrl);
                                setChatLoadingId(null);
                                return;
                              }

                              if (!result.success || !result.url) {
                                setChatError(result.error || '無法建立對話，請稍後再試');
                                setChatLoadingId(null);
                                return;
                              }

                              // 記錄已發起聯繫
                              await recordContact(targetUserId);

                              // 導向聊天室（使用 conversation ID）
                              router.push(result.url);
                            } catch (err: any) {
                              console.error('[私訊接單按鈕] Error:', err);
                              setChatError('發生錯誤，請稍後再試');
                              setChatLoadingId(null);
                            }
                          }}
                          className={`
                            w-full flex items-center justify-center gap-2 py-3 font-bold rounded-xl 
                            transition-all duration-200 shadow-md hover:shadow-lg text-sm
                            ${chatLoadingId === `wish:${wish.id}`
                              ? 'bg-orange-300 cursor-not-allowed'
                              : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'
                            }
                          `}
                        >
                          {chatLoadingId === `wish:${wish.id}` ? (
                            <>
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="text-white">處理中...</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>私訊接單</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
      
    </div>
  );
}

// 使用 Suspense 包裝，因為 useSearchParams 需要
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
