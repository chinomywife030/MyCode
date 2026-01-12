import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { Button } from './Button';
import { getSupabaseClient } from '@bangbuy/core';

export interface FilterOptions {
  country?: string;
  category?: string;
  status?: string;
  sortBy?: 'newest' | 'price_low' | 'price_high';
  minPrice?: number;
  maxPrice?: number;
  isUrgent?: boolean;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onClear: () => void;
  initialFilters?: FilterOptions;
}

// 國家列表將從 Supabase 動態獲取
interface Country {
  code: string;
  name_zh: string;
  emoji: string;
}

// 常用國家代碼（硬編碼）
const POPULAR_COUNTRY_CODES = ['JP', 'KR', 'US', 'DE', 'GB', 'FR'];

const CATEGORIES = [
  { value: 'toy', label: '🧸 玩具' },
  { value: 'luxury', label: '👜 精品' },
  { value: 'digital', label: '📱 3C' },
  { value: 'clothes', label: '👕 服飾' },
  { value: 'beauty', label: '💄 美妝' },
  { value: 'food', label: '🍜 零食' },
  { value: 'medicine', label: '💊 藥妝' },
  { value: 'sports', label: '⚽ 運動' },
  { value: 'home', label: '🏠 居家' },
  { value: 'other', label: '📦 其他' },
];

const STATUSES = [
  { value: 'open', label: '進行中' },
  { value: 'closed', label: '已結束' },
  { value: 'all', label: '全部' },
];

/**
 * 篩選 Modal 組件
 */
const SORT_OPTIONS = [
  { value: 'newest', label: '最新' },
  { value: 'price_low', label: '價格：低到高' },
  { value: 'price_high', label: '價格：高到低' },
];

export function FilterModal({
  visible,
  onClose,
  onApply,
  onClear,
  initialFilters = {},
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  
  // 使用 useRef 来稳定 TextInput 的引用，防止重新挂载
  const searchInputRef = useRef<TextInput>(null);
  
  // 使用 useCallback 稳定 onChangeText 处理函数
  const handleSearchChange = useCallback((text: string) => {
    setCountrySearchQuery(text);
  }, []);
  
  const handleSearchClear = useCallback(() => {
    setCountrySearchQuery('');
    // 保持焦点在输入框
    searchInputRef.current?.focus();
  }, []);

  // 當 initialFilters 改變時，同步到內部狀態
  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
    }
  }, [initialFilters, visible]);

  // 當 Modal 打開時，從 Supabase 獲取國家列表
  useEffect(() => {
    if (visible && countries.length === 0) {
      loadCountries();
    }
  }, [visible]);

  const loadCountries = async () => {
    try {
      setCountriesLoading(true);
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('countries')
        .select('code, name_zh, emoji, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[FilterModal] Failed to load countries:', error);
        // 如果獲取失敗，使用空數組（不會顯示國家選項）
        setCountries([]);
        return;
      }

      if (data && data.length > 0) {
        const formattedCountries: Country[] = data.map((item) => ({
          code: item.code || '',
          name_zh: item.name_zh || '',
          emoji: item.emoji || '🏳️',
        }));
        setCountries(formattedCountries);
        console.log('[FilterModal] Loaded countries:', formattedCountries.length);
      } else {
        setCountries([]);
      }
    } catch (err) {
      console.error('[FilterModal] Exception loading countries:', err);
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  };

  const handleSelect = (type: 'country' | 'category' | 'status', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type] === value ? undefined : value,
    }));
  };

  const handleSortSelect = (value: 'newest' | 'price_low' | 'price_high') => {
    setFilters((prev) => ({
      ...prev,
      sortBy: prev.sortBy === value ? undefined : value,
    }));
  };

  const handlePriceChange = (type: 'minPrice' | 'maxPrice', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFilters((prev) => ({
      ...prev,
      [type]: numValue && !isNaN(numValue) && numValue >= 0 ? numValue : undefined,
    }));
  };

  const handleUrgentToggle = (value: boolean) => {
    setFilters((prev) => ({
      ...prev,
      isUrgent: value ? true : undefined,
    }));
  };

  // 使用 useMemo 分離常用國家和其他國家，並支持搜索過濾
  const { popularCountries, otherCountries, filteredCountries } = useMemo(() => {
    if (countrySearchQuery.trim()) {
      // 搜索模式：過濾所有國家，不分组
      const query = countrySearchQuery.toLowerCase().trim();
      const filtered = countries.filter((country) =>
        country.name_zh.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        (country.emoji && country.emoji.includes(query))
      );
      return {
        popularCountries: [],
        otherCountries: [],
        filteredCountries: filtered.sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-TW')),
      };
    } else {
      // 正常模式：分組
      const popular: Country[] = [];
      const others: Country[] = [];

      countries.forEach((country) => {
        if (POPULAR_COUNTRY_CODES.includes(country.code)) {
          popular.push(country);
        } else {
          others.push(country);
        }
      });

      // 常用國家按 POPULAR_COUNTRY_CODES 順序排序
      const sortedPopular = popular.sort((a, b) => {
        const indexA = POPULAR_COUNTRY_CODES.indexOf(a.code);
        const indexB = POPULAR_COUNTRY_CODES.indexOf(b.code);
        return indexA - indexB;
      });

      // 其他國家按中文名稱排序
      const sortedOthers = others.sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-TW'));

      return {
        popularCountries: sortedPopular,
        otherCountries: sortedOthers,
        filteredCountries: [],
      };
    }
  }, [countries, countrySearchQuery]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({});
    onClear();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      // ✅ 防止 Android 返回键关闭键盘
      hardwareAccelerated={true}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>篩選條件</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {/* 國家篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>購買國家</Text>
              
              {/* 搜索輸入框 */}
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="🔍 搜尋國家..."
                  placeholderTextColor={colors.textMuted}
                  value={countrySearchQuery}
                  onChangeText={handleSearchChange}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  blurOnSubmit={false}
                  editable={true}
                  // ✅ 关键：使用稳定的 key 防止重新挂载
                  key="country-search-input"
                />
                {countrySearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={handleSearchClear}
                    style={styles.searchClearButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {countriesLoading ? (
                <Text style={styles.loadingText}>載入國家列表中...</Text>
              ) : countries.length === 0 ? (
                <Text style={styles.emptyText}>暫無國家資料</Text>
              ) : countrySearchQuery.trim() ? (
                // 搜索模式：顯示所有匹配結果
                filteredCountries.length === 0 ? (
                  <Text style={styles.emptyText}>未找到匹配的國家</Text>
                ) : (
                  <View style={styles.optionsContainer}>
                    {filteredCountries.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={[
                          styles.optionButton,
                          filters.country === country.code && styles.optionButtonSelectedNew,
                        ]}
                        onPress={() => handleSelect('country', country.code)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            filters.country === country.code && styles.optionTextSelectedNew,
                          ]}
                        >
                          {country.emoji} {country.name_zh}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              ) : (
                // 正常模式：分組顯示
                <>
                  {/* 常用國家 */}
                  {popularCountries.length > 0 && (
                    <View style={styles.countryGroup}>
                      <Text style={styles.countryGroupTitle}>常用國家</Text>
                      <View style={styles.optionsContainer}>
                        {popularCountries.map((country) => (
                          <TouchableOpacity
                            key={country.code}
                            style={[
                              styles.optionButton,
                              filters.country === country.code && styles.optionButtonSelectedNew,
                            ]}
                            onPress={() => handleSelect('country', country.code)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                filters.country === country.code && styles.optionTextSelectedNew,
                              ]}
                            >
                              {country.emoji} {country.name_zh}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 其他國家 */}
                  {otherCountries.length > 0 && (
                    <View style={styles.countryGroup}>
                      <Text style={styles.countryGroupTitle}>其他國家</Text>
                      <View style={styles.optionsContainer}>
                        {otherCountries.map((country) => (
                          <TouchableOpacity
                            key={country.code}
                            style={[
                              styles.optionButton,
                              filters.country === country.code && styles.optionButtonSelectedNew,
                            ]}
                            onPress={() => handleSelect('country', country.code)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                filters.country === country.code && styles.optionTextSelectedNew,
                              ]}
                            >
                              {country.emoji} {country.name_zh}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* 分類篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>分類</Text>
              <View style={styles.optionsContainer}>
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.optionButton,
                      filters.category === category.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelect('category', category.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.category === category.value && styles.optionTextSelected,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 狀態篩選 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>狀態</Text>
              <View style={styles.optionsContainer}>
                {STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.optionButton,
                      filters.status === status.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSelect('status', status.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.status === status.value && styles.optionTextSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 排序選項 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>排序方式</Text>
              <View style={styles.optionsContainer}>
                {SORT_OPTIONS.map((sort) => (
                  <TouchableOpacity
                    key={sort.value}
                    style={[
                      styles.optionButton,
                      filters.sortBy === sort.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleSortSelect(sort.value as 'newest' | 'price_low' | 'price_high')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filters.sortBy === sort.value && styles.optionTextSelected,
                      ]}
                    >
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 價格範圍 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>價格範圍</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceLabel}>最低價格</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.pricePrefix}>NT$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={filters.minPrice !== undefined ? filters.minPrice.toString() : ''}
                      onChangeText={(text) => handlePriceChange('minPrice', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceLabel}>最高價格</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.pricePrefix}>NT$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="不限"
                      placeholderTextColor={colors.textMuted}
                      value={filters.maxPrice !== undefined ? filters.maxPrice.toString() : ''}
                      onChangeText={(text) => handlePriceChange('maxPrice', text)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 緊急狀態 */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.sectionTitle}>僅顯示緊急需求</Text>
                  <Text style={styles.switchHint}>顯示標記為緊急的需求</Text>
                </View>
                <Switch
                  value={filters.isUrgent === true}
                  onValueChange={handleUrgentToggle}
                  trackColor={{ false: colors.border, true: colors.brandOrange }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="清除"
              onPress={handleClear}
              variant="ghost"
              size="md"
              style={styles.clearButton}
            />
            <Button
              title="套用"
              onPress={handleApply}
              variant="primary"
              size="md"
              style={styles.applyButton}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  optionButtonSelected: {
    backgroundColor: colors.brandOrange,
    borderColor: colors.brandOrange,
  },
  // 新的選中狀態樣式（邊框橙色，不是實心）
  optionButtonSelectedNew: {
    backgroundColor: 'transparent',
    borderColor: colors.brandOrange,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  optionTextSelected: {
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
  // 新的選中文字樣式（橙色）
  optionTextSelectedNew: {
    color: colors.brandOrange,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  searchClearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  countryGroup: {
    marginBottom: spacing.lg,
  },
  countryGroupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  pricePrefix: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

