/**
 * ImmoCardActions - 卡片底部操作按鈕組件
 * 
 * 包含：
 * - 主要 CTA 按鈕（橘色實心，如：聯絡委託人/私訊）
 * - 次要按鈕（outline/ghost，如：查看詳情）
 * 
 * 設計原則：
 * - 主要 CTA 層級高，使用品牌橘色
 * - 次要按鈕層級低，使用 outline 或文字按鈕
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  immoColors,
  immoSpacing,
  immoRadius,
  immoTypography,
} from './theme';

// ============================================
// Props
// ============================================
interface ImmoCardActionsProps {
  /** 主要 CTA 文字 */
  primaryLabel: string;
  /** 主要 CTA 點擊事件 */
  onPrimaryPress: () => void;
  /** 主要 CTA 是否載入中 */
  primaryLoading?: boolean;
  /** 主要 CTA 圖示（可選） */
  primaryIcon?: keyof typeof Ionicons.glyphMap;
  /** 主要 CTA 顏色（預設：wishPrimary 橘色） */
  primaryColor?: string;
  
  /** 是否顯示次要按鈕（查看詳情） */
  showSecondary?: boolean;
  /** 次要按鈕文字（預設：查看詳情） */
  secondaryLabel?: string;
  /** 次要按鈕點擊事件 */
  onSecondaryPress?: () => void;
  /** 次要按鈕樣式：'outline' | 'ghost' */
  secondaryStyle?: 'outline' | 'ghost';
  /** 次要按鈕顏色（預設：secondary 藍色） */
  secondaryColor?: string;
  
  /** 佈局方式：'row'（並排） | 'stack'（堆疊） */
  layout?: 'row' | 'stack';
}

// ============================================
// Component
// ============================================
export function ImmoCardActions({
  primaryLabel,
  onPrimaryPress,
  primaryLoading = false,
  primaryIcon = 'chatbubble-outline',
  primaryColor = immoColors.wishPrimary, // 預設橘色（Wish）
  showSecondary = true,
  secondaryLabel = '查看詳情',
  onSecondaryPress,
  secondaryStyle = 'outline',
  secondaryColor = immoColors.secondary, // 預設藍色
  layout = 'row',
}: ImmoCardActionsProps) {
  const handlePrimaryPress = () => {
    if (!primaryLoading) {
      onPrimaryPress();
    }
  };

  const isRow = layout === 'row';

  return (
    <View style={[styles.container, isRow && styles.containerRow]}>
      {/* 次要按鈕（查看詳情） - 放在主 CTA 之前，視覺層級較低 */}
      {showSecondary && onSecondaryPress && (
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { borderColor: secondaryColor },
            isRow && styles.buttonFlex,
            secondaryStyle === 'ghost' && styles.ghostButton,
          ]}
          onPress={onSecondaryPress}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              { color: secondaryStyle === 'ghost' ? immoColors.textSecondary : secondaryColor },
              secondaryStyle === 'ghost' && styles.ghostButtonText,
            ]}
          >
            {secondaryLabel}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={secondaryStyle === 'ghost' ? immoColors.textSecondary : secondaryColor}
          />
        </TouchableOpacity>
      )}

      {/* 主要 CTA 按鈕（可自訂顏色） */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: primaryColor },
          isRow && styles.buttonFlex,
          primaryLoading && styles.buttonDisabled,
        ]}
        onPress={handlePrimaryPress}
        activeOpacity={0.8}
        disabled={primaryLoading}
      >
        {primaryIcon && (
          <Ionicons name={primaryIcon} size={16} color={immoColors.white} />
        )}
        <Text style={styles.primaryButtonText}>
          {primaryLoading ? '處理中...' : primaryLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    gap: immoSpacing.sm,
  },
  containerRow: {
    flexDirection: 'row',
  },
  buttonFlex: {
    flex: 1,
  },
  // 主要 CTA 按鈕（顏色由 prop 決定）
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: immoSpacing.xs,
    paddingVertical: immoSpacing.md,
    borderRadius: immoRadius.lg,
  },
  primaryButtonText: {
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.semibold,
    color: immoColors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // 次要按鈕（outline 樣式，顏色由 prop 決定）
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: immoSpacing.xs,
    paddingVertical: immoSpacing.md,
    borderRadius: immoRadius.lg,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: immoTypography.fontSize.base,
    fontWeight: immoTypography.fontWeight.semibold,
  },
  // Ghost 樣式（更低層級）
  ghostButton: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    color: immoColors.textSecondary,
    fontWeight: immoTypography.fontWeight.medium,
  },
});

export default ImmoCardActions;

