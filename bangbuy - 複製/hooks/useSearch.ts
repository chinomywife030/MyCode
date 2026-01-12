/**
 * 🔍 搜尋狀態 Hook (v2)
 * 
 * - 與 URL query 同步
 * - 300ms debounce
 * - 支援完整篩選條件
 * - 整合 searchUtils 進階搜尋
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { FilterValues } from '@/components/search/FilterPanel';

export interface SearchState extends FilterValues {
  q: string;
}

interface UseSearchOptions {
  debounceMs?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 從 URL 初始化狀態
  const [searchState, setSearchState] = useState<SearchState>(() => ({
    q: searchParams.get('q') || '',
    destination: searchParams.get('destination') || undefined,
    category: searchParams.get('category') || undefined,
    priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
    priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    status: searchParams.get('status') || undefined,
    sort: (searchParams.get('sort') as SearchState['sort']) || undefined,
  }));

  // Debounced 搜尋詞（用於實際過濾）
  const [debouncedQ, setDebouncedQ] = useState(searchState.q);

  // Debounce 搜尋詞
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchState.q);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchState.q, debounceMs]);

  // 同步到 URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedQ) params.set('q', debouncedQ);
    if (searchState.destination) params.set('destination', searchState.destination);
    if (searchState.category) params.set('category', searchState.category);
    if (searchState.priceMin !== undefined) params.set('priceMin', String(searchState.priceMin));
    if (searchState.priceMax !== undefined) params.set('priceMax', String(searchState.priceMax));
    if (searchState.dateFrom) params.set('dateFrom', searchState.dateFrom);
    if (searchState.dateTo) params.set('dateTo', searchState.dateTo);
    if (searchState.status) params.set('status', searchState.status);
    if (searchState.sort) params.set('sort', searchState.sort);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // 使用 replace 避免產生太多歷史記錄
    router.replace(newUrl, { scroll: false });
  }, [
    debouncedQ,
    searchState.destination,
    searchState.category,
    searchState.priceMin,
    searchState.priceMax,
    searchState.dateFrom,
    searchState.dateTo,
    searchState.status,
    searchState.sort,
    pathname,
    router,
  ]);

  // 更新搜尋詞
  const setQuery = useCallback((q: string) => {
    setSearchState(prev => ({ ...prev, q }));
  }, []);

  // 清除搜尋詞
  const clearQuery = useCallback(() => {
    setSearchState(prev => ({ ...prev, q: '' }));
  }, []);

  // 更新 filters（批次更新）
  const setFilters = useCallback((filters: Partial<FilterValues>) => {
    setSearchState(prev => ({ ...prev, ...filters }));
  }, []);

  // 設定 destination filter
  const setDestination = useCallback((destination?: string) => {
    setSearchState(prev => ({ ...prev, destination }));
  }, []);

  // 設定 category filter
  const setCategory = useCallback((category?: string) => {
    setSearchState(prev => ({ ...prev, category }));
  }, []);

  // 設定排序
  const setSort = useCallback((sort?: SearchState['sort']) => {
    setSearchState(prev => ({ ...prev, sort }));
  }, []);

  // 清除所有 filter（保留 q）
  const clearFilters = useCallback(() => {
    setSearchState(prev => ({
      q: prev.q,
      destination: undefined,
      category: undefined,
      priceMin: undefined,
      priceMax: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      sort: undefined,
    }));
  }, []);

  // 清除所有（搜尋 + filter）
  const clearAll = useCallback(() => {
    setSearchState({
      q: '',
      destination: undefined,
      category: undefined,
      priceMin: undefined,
      priceMax: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      sort: undefined,
    });
  }, []);

  // 角色切換時保留 q，清空不相容 filter
  const onModeChange = useCallback(() => {
    setSearchState(prev => ({
      q: prev.q,
      destination: undefined,
      category: undefined,
      priceMin: undefined,
      priceMax: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      sort: undefined,
    }));
  }, []);

  // 是否有搜尋詞
  const hasQuery = useMemo(() => !!debouncedQ.trim(), [debouncedQ]);

  // 是否有任何搜尋/過濾條件
  const hasFilters = useMemo(() => {
    return !!(
      debouncedQ ||
      searchState.destination ||
      searchState.category ||
      searchState.priceMin !== undefined ||
      searchState.priceMax !== undefined ||
      searchState.dateFrom ||
      searchState.dateTo ||
      searchState.status
    );
  }, [
    debouncedQ,
    searchState.destination,
    searchState.category,
    searchState.priceMin,
    searchState.priceMax,
    searchState.dateFrom,
    searchState.dateTo,
    searchState.status,
  ]);

  // Active filter 數量（不含 q 和 sort）
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchState.destination) count++;
    if (searchState.category) count++;
    if (searchState.priceMin !== undefined) count++;
    if (searchState.priceMax !== undefined) count++;
    if (searchState.dateFrom) count++;
    if (searchState.dateTo) count++;
    if (searchState.status) count++;
    return count;
  }, [
    searchState.destination,
    searchState.category,
    searchState.priceMin,
    searchState.priceMax,
    searchState.dateFrom,
    searchState.dateTo,
    searchState.status,
  ]);

  // Filter values（用於 FilterPanel）
  const filterValues = useMemo<FilterValues>(() => ({
    destination: searchState.destination,
    category: searchState.category,
    priceMin: searchState.priceMin,
    priceMax: searchState.priceMax,
    dateFrom: searchState.dateFrom,
    dateTo: searchState.dateTo,
    status: searchState.status,
    sort: searchState.sort,
  }), [
    searchState.destination,
    searchState.category,
    searchState.priceMin,
    searchState.priceMax,
    searchState.dateFrom,
    searchState.dateTo,
    searchState.status,
    searchState.sort,
  ]);

  // 搜尋選項（用於 searchItems）
  const searchOptions = useMemo(() => ({
    q: debouncedQ,
    destination: searchState.destination,
    category: searchState.category,
    priceMin: searchState.priceMin,
    priceMax: searchState.priceMax,
    dateFrom: searchState.dateFrom,
    dateTo: searchState.dateTo,
    status: searchState.status,
    sort: searchState.sort,
  }), [
    debouncedQ,
    searchState.destination,
    searchState.category,
    searchState.priceMin,
    searchState.priceMax,
    searchState.dateFrom,
    searchState.dateTo,
    searchState.status,
    searchState.sort,
  ]);

  return {
    // State
    q: searchState.q,
    debouncedQ,
    destination: searchState.destination,
    category: searchState.category,
    priceMin: searchState.priceMin,
    priceMax: searchState.priceMax,
    dateFrom: searchState.dateFrom,
    dateTo: searchState.dateTo,
    status: searchState.status,
    sort: searchState.sort,
    hasQuery,
    hasFilters,
    activeFilterCount,
    filterValues,
    searchOptions,
    
    // Actions
    setQuery,
    clearQuery,
    setFilters,
    setDestination,
    setCategory,
    setSort,
    clearFilters,
    clearAll,
    onModeChange,
  };
}

