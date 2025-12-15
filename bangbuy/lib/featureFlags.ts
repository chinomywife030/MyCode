/**
 * 🚩 Feature Flags - 功能開關配置
 * 
 * 統一管理所有功能的啟用狀態
 * 未啟用的功能會顯示「即將推出」提示
 */

export const FEATURE_FLAGS = {
  // ✅ 已上線功能
  home: true,
  notifications: true,
  chat: true,
  dashboard: true,
  calculator: true,
  trips: true,
  wishRequests: true,
  
  // 🚧 開發中功能
  wallet: false,
  reports: false,
  admin: false,
  orders: false,
  reviews: false,
  
  // 📋 法務頁面（必須存在）
  terms: true,
  privacy: true,
  disclaimer: true,
  cookies: true,
  copyright: true,
} as const;

export type FeatureKey = keyof typeof FEATURE_FLAGS;

/**
 * 檢查功能是否啟用
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURE_FLAGS[key] === true;
}

/**
 * 獲取功能狀態描述
 */
export function getFeatureStatus(key: FeatureKey): 'enabled' | 'coming_soon' | 'disabled' {
  if (FEATURE_FLAGS[key] === true) return 'enabled';
  return 'coming_soon';
}

/**
 * 根據路徑獲取對應的 feature key
 */
export function getFeatureKeyFromPath(path: string): FeatureKey | null {
  const pathMap: Record<string, FeatureKey> = {
    '/': 'home',
    '/notifications': 'notifications',
    '/chat': 'chat',
    '/dashboard': 'dashboard',
    '/calculator': 'calculator',
    '/trips': 'trips',
    '/create': 'wishRequests',
    '/wallet': 'wallet',
    '/reports': 'reports',
    '/admin': 'admin',
    '/orders': 'orders',
    '/reviews': 'reviews',
    '/terms': 'terms',
    '/privacy': 'privacy',
    '/disclaimer': 'disclaimer',
    '/cookies': 'cookies',
    '/copyright': 'copyright',
  };

  // 精確匹配
  if (pathMap[path]) return pathMap[path];

  // 前綴匹配
  for (const [prefix, key] of Object.entries(pathMap)) {
    if (path.startsWith(prefix + '/')) return key;
  }

  return null;
}

