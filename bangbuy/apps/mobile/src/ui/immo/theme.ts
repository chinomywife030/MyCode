/**
 * ImmoScout 風格 UI Theme Tokens
 * 設計參考 Immobilienscout24 的視覺風格
 */

// ============================================
// Color Palette
// ============================================
export const immoColors = {
  // Semantic Primary Colors（語意色）
  // Trip / 行程相關：藍色
  tripPrimary: '#0066FF',
  tripPrimaryDark: '#0052CC',
  tripPrimaryLight: '#E6F0FF',
  
  // Wish / 代購需求相關：橘色
  wishPrimary: '#FF6B35',
  wishPrimaryDark: '#E55A2B',
  wishPrimaryLight: '#FFF7ED',
  
  // Legacy Primary（向後兼容，預設為 wishPrimary）
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FFF7ED',
  
  // Secondary - 藍色系（次要操作，等同 tripPrimary）
  secondary: '#0066FF',
  secondaryDark: '#0052CC',
  secondaryLight: '#E6F0FF',
  
  // Accent - 輔助色
  accent: '#00B894',
  accentLight: '#E6F9F5',
  
  // Neutral - 中性色
  white: '#FFFFFF',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F0F0F0',
  
  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLight: '#D1D5DB',
  
  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Price (醒目橘色)
  priceHighlight: '#FF6B35',
  priceBg: '#FFF7ED',
  
  // Heart/Favorite
  heartActive: '#EF4444',
  heartInactive: 'rgba(255, 255, 255, 0.9)',
} as const;

// ============================================
// Typography
// ============================================
export const immoTypography = {
  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================
// Spacing
// ============================================
export const immoSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ============================================
// Border Radius
// ============================================
export const immoRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// ============================================
// Shadows (ImmoScout 風格 - 柔和陰影)
// ============================================
export const immoShadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

// ============================================
// Component Specific Styles
// ============================================
export const immoCard = {
  borderRadius: immoRadius.xl,
  backgroundColor: immoColors.white,
  borderWidth: 1,
  borderColor: immoColors.borderLight,
  ...immoShadows.card,
} as const;

export const immoChip = {
  borderRadius: immoRadius.full,
  paddingHorizontal: immoSpacing.md,
  paddingVertical: immoSpacing.xs,
  backgroundColor: immoColors.white,
  borderWidth: 1,
  borderColor: immoColors.border,
} as const;

export const immoButton = {
  primary: {
    backgroundColor: immoColors.primary,
    borderRadius: immoRadius.lg,
    paddingHorizontal: immoSpacing.lg,
    paddingVertical: immoSpacing.md,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: immoRadius.lg,
    borderWidth: 1,
    borderColor: immoColors.primary,
    paddingHorizontal: immoSpacing.lg,
    paddingVertical: immoSpacing.md,
  },
  text: {
    backgroundColor: 'transparent',
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs,
  },
} as const;

export const immoSearchBar = {
  height: 48,
  borderRadius: immoRadius.xl,
  backgroundColor: immoColors.white,
  borderWidth: 1,
  borderColor: immoColors.border,
  paddingHorizontal: immoSpacing.lg,
  ...immoShadows.sm,
} as const;

// ============================================
// Export all as default theme object
// ============================================
export const immoTheme = {
  colors: immoColors,
  typography: immoTypography,
  spacing: immoSpacing,
  radius: immoRadius,
  shadows: immoShadows,
  card: immoCard,
  chip: immoChip,
  button: immoButton,
  searchBar: immoSearchBar,
} as const;

export default immoTheme;

