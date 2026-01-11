/**
 * 穩定的搜尋欄元件
 * 使用 React.memo 避免不必要的重新渲染，確保輸入時鍵盤不會收起
 * 
 * 根因分析：原本的 ImmoScoutSearchBar 在父組件每次 render 時都會重新創建，
 * 導致 TextInput 失去 focus，鍵盤自動收起。
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { immoColors, immoSpacing, immoRadius, immoShadows, immoTypography } from '@/src/ui/immo/theme';

interface StableSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

/**
 * 穩定的搜尋欄元件
 * 使用 React.memo 確保只有在 props 真正改變時才重新渲染
 */
export const StableSearchBar = memo<StableSearchBarProps>(({
  value,
  onChangeText,
  placeholder = '搜尋...',
  onFilterPress,
  showFilter = true,
}) => {
  const inputRef = useRef<TextInput>(null);

  // 確保 onChangeText 是穩定的引用（避免因為父組件重新渲染而導致重新 mount）
  const handleChangeText = (text: string) => {
    onChangeText(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        {/* Search Icon */}
        <Ionicons
          name="search-outline"
          size={20}
          color={immoColors.textMuted}
          style={styles.searchIcon}
        />
        
        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={immoColors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        
        {/* Clear Button (when has value) */}
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleChangeText('')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={immoColors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Button */}
      {showFilter && onFilterPress && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={immoColors.wishPrimary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // 自定義比較函數，只有這些 props 改變時才重新渲染
  // 注意：onChangeText 和 onFilterPress 應該是穩定的引用（useCallback 或 useState setter）
  // setSearchQueryRaw 是 useState setter，本身是穩定的；handleFilterPress 用 useCallback 包裝
  return (
    prevProps.value === nextProps.value &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.showFilter === nextProps.showFilter &&
    prevProps.onChangeText === nextProps.onChangeText &&
    prevProps.onFilterPress === nextProps.onFilterPress
  );
});

StableSearchBar.displayName = 'StableSearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: immoSpacing.lg,
    paddingVertical: immoSpacing.sm,
    gap: immoSpacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.xl,
    borderWidth: 1,
    borderColor: immoColors.border,
    paddingHorizontal: immoSpacing.md,
    ...immoShadows.sm,
  },
  searchIcon: {
    marginRight: immoSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: immoTypography.fontSize.base,
    color: immoColors.textPrimary,
    height: '100%',
  },
  clearButton: {
    padding: immoSpacing.xs,
    marginLeft: immoSpacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.xl,
    borderWidth: 1,
    borderColor: immoColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...immoShadows.sm,
  },
});
