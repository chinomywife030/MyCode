import { Platform } from 'react-native';

/**
 * BangBuy 品牌主題 Tokens
 * 參考網站：https://bangbuy.app
 */

// 顏色系統
export const colors = {
  // 品牌橘色（主視覺 - 需求頁）
  brandOrange: '#f97316', // orange-500
  brandOrangeDark: '#ea580c', // orange-600
  brandOrangeLight: '#fb923c', // orange-400
  brandOrangeGradient: ['#f97316', '#ea580c'] as [string, string], // 漸層

  // 品牌藍色（行程頁）
  brandBlue: '#3b82f6', // blue-500
  brandBlueDark: '#2563eb', // blue-600
  brandBlueLight: '#60a5fa', // blue-400
  brandBlueGradient: ['#3b82f6', '#2563eb'] as [string, string], // 漸層

  // 背景色
  bg: '#f9fafb', // gray-50 (很淡的灰)
  bgCard: '#ffffff', // 白色卡片

  // 文字色
  text: '#111827', // gray-900
  textMuted: '#6b7280', // gray-500
  textLight: '#9ca3af', // gray-400

  // 邊框色
  border: '#e5e7eb', // gray-200
  borderLight: '#f3f4f6', // gray-100

  // 狀態色
  success: '#10b981', // green-500
  error: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
};

// 圓角系統
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// 間距系統
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

// 陰影系統（iOS + Android 通用）
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
};

// 字體大小
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

// 字體粗細
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};


