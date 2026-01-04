/**
 * 國家選擇器組件
 * 從 Supabase countries 表讀取資料
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { supabase } from '@/src/lib/supabase';

interface Country {
  code: string;
  name_zh: string;
  emoji: string;
  name_en?: string;
}

interface CountryPickerFieldProps {
  value?: string; // 國家代碼（例如：'JP'）
  onValueChange: (code: string) => void;
  label?: string;
  required?: boolean;
}

export function CountryPickerField({
  value,
  onValueChange,
  label = '購買國家',
  required = false,
}: CountryPickerFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 從 Supabase 讀取國家列表
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('countries')
        .select('code, name_zh, name_en, emoji, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (queryError) {
        console.error('[CountryPickerField] Query error:', {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
        });
        setError(`載入失敗：${queryError.message || '未知錯誤'}`);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('[CountryPickerField] No countries found');
        setError('未找到國家資料');
        return;
      }

      // Debug log
      console.log('[CountryPickerField] Countries count:', data.length);
      if (data.length > 0) {
        console.log('[CountryPickerField] First country:', JSON.stringify(data[0], null, 2));
      }

      // 轉換資料格式
      const formattedCountries: Country[] = data.map((item) => ({
        code: item.code || '',
        name_zh: item.name_zh || '',
        emoji: item.emoji || '🏳️',
        name_en: (item as any).name_en || '',
      }));

      console.log('[CountryPickerField] Formatted countries count:', formattedCountries.length);
      console.log('[CountryPickerField] First formatted country:', formattedCountries[0]);

      setCountries(formattedCountries);
    } catch (err: any) {
      console.error('[CountryPickerField] Exception:', err);
      setError(`載入失敗：${err.message || '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCountry = countries.find((c) => c.code === value);
  
  // 搜尋過濾（支援 name_zh, name_en, code）
  const filteredCountries = useMemo(() => {
    if (!countries || countries.length === 0) {
      return [];
    }
    if (!searchQuery.trim()) {
      return countries;
    }
    const query = searchQuery.toLowerCase();
    return countries.filter((c) => {
      return (
        c.name_zh.toLowerCase().includes(query) ||
        (c.name_en && c.name_en.toLowerCase().includes(query)) ||
        c.code.toLowerCase().includes(query)
      );
    });
  }, [countries, searchQuery]);

  const handleSelect = (code: string) => {
    onValueChange(code);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={styles.picker}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {selectedCountry ? (
          <View style={styles.selectedContainer}>
            <Text style={styles.flag}>{selectedCountry.emoji}</Text>
            <Text style={styles.selectedText}>
              {selectedCountry.name_zh} ({selectedCountry.code})
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>請選擇國家</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>選擇國家</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="搜尋國家..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brandOrange} />
                <Text style={styles.loadingText}>載入國家列表中...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadCountries}
                >
                  <Text style={styles.retryButtonText}>重試</Text>
                </TouchableOpacity>
              </View>
            ) : filteredCountries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? '找不到符合的國家' : '沒有國家資料'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => {
                  // Debug log for first item
                  if (filteredCountries.indexOf(item) === 0) {
                    console.log('[CountryPickerField] Rendering first item:', {
                      code: item.code,
                      name_zh: item.name_zh,
                      emoji: item.emoji,
                    });
                  }
                  return (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        value === item.code && styles.countryItemSelected,
                      ]}
                      onPress={() => handleSelect(item.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.countryFlag}>{item.emoji || '🏳️'}</Text>
                      <Text style={styles.countryName}>{item.name_zh || item.code}</Text>
                      <Text style={styles.countryCode}>{item.code}</Text>
                      {value === item.code && (
                        <Ionicons name="checkmark" size={20} color={colors.brandOrange} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.countryList}
                contentContainerStyle={styles.countryListContent}
                showsVerticalScrollIndicator={true}
                initialNumToRender={20}
                windowSize={10}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  picker: {
    height: 50,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  selectedText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    flex: 1,
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  countryList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  countryListContent: {
    paddingBottom: spacing.md,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  countryItemSelected: {
    backgroundColor: '#fff9f0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  countryName: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  countryCode: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brandOrange,
    borderRadius: radius.md,
  },
  retryButtonText: {
    fontSize: fontSize.sm,
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

