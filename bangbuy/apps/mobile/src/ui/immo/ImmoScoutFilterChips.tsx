/**
 * ImmoScout 風格 Filter Chips
 * 可橫向滑動的 filter chips
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { immoColors, immoSpacing, immoRadius, immoTypography, immoShadows } from './theme';

export interface FilterChip {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isActive?: boolean;
}

interface ImmoScoutFilterChipsProps {
  chips: FilterChip[];
  onChipPress?: (chipId: string) => void;
  activeChipIds?: string[];
}

export function ImmoScoutFilterChips({
  chips,
  onChipPress,
  activeChipIds = [],
}: ImmoScoutFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {chips.map((chip) => {
        const isActive = activeChipIds.includes(chip.id);
        
        return (
          <TouchableOpacity
            key={chip.id}
            style={[
              styles.chip,
              isActive && styles.chipActive,
            ]}
            onPress={() => onChipPress?.(chip.id)}
            activeOpacity={0.7}
          >
            {chip.icon && (
              <Ionicons
                name={chip.icon}
                size={16}
                color={isActive ? immoColors.white : immoColors.textSecondary}
                style={styles.chipIcon}
              />
            )}
            <Text
              style={[
                styles.chipLabel,
                isActive && styles.chipLabelActive,
              ]}
            >
              {chip.label}
            </Text>
            {isActive && (
              <Ionicons
                name="close"
                size={14}
                color={immoColors.white}
                style={styles.chipClose}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// 預設 filter chips 配置
export const defaultFilterChips: FilterChip[] = [
  { id: 'destination', label: '目的地', icon: 'location-outline' },
  { id: 'price', label: '價格', icon: 'pricetag-outline' },
  { id: 'date', label: '日期', icon: 'calendar-outline' },
  { id: 'category', label: '類型', icon: 'grid-outline' },
  { id: 'urgent', label: '急件', icon: 'flash-outline' },
];

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: immoSpacing.lg,
    paddingVertical: immoSpacing.sm,
    gap: immoSpacing.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: immoSpacing.md,
    paddingVertical: immoSpacing.sm,
    backgroundColor: immoColors.white,
    borderRadius: immoRadius.full,
    borderWidth: 1,
    borderColor: immoColors.border,
    ...immoShadows.sm,
  },
  chipActive: {
    backgroundColor: immoColors.wishPrimary,
    borderColor: immoColors.wishPrimary,
  },
  chipIcon: {
    marginRight: immoSpacing.xs,
  },
  chipLabel: {
    fontSize: immoTypography.fontSize.sm,
    fontWeight: immoTypography.fontWeight.medium,
    color: immoColors.textSecondary,
  },
  chipLabelActive: {
    color: immoColors.white,
  },
  chipClose: {
    marginLeft: immoSpacing.xs,
  },
});

export default ImmoScoutFilterChips;

