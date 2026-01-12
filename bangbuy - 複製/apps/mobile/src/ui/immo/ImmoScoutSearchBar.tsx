/**
 * ImmoScout 風格 SearchBar
 * 圓角搜索欄，帶搜索 icon 和 filter 按鈕
 */

import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { immoColors, immoSpacing, immoRadius, immoShadows, immoTypography } from './theme';

interface ImmoScoutSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export function ImmoScoutSearchBar({
  value,
  onChangeText,
  placeholder = '搜尋...',
  onFilterPress,
  showFilter = true,
}: ImmoScoutSearchBarProps) {
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
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
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
            onPress={() => onChangeText('')}
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
}

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

export default ImmoScoutSearchBar;

