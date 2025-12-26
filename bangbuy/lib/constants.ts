/**
 * 🔒 系統常數
 * 
 * Beta locked – no new features allowed
 * 只允許修 Bug、補防呆、補錯誤處理
 */

// Beta 鎖定標記 - 禁止新增功能
export const BETA_LOCKED = true;

// 版本資訊
export const APP_VERSION = '1.0.0-beta';
export const BETA_START_DATE = '2024-12-21';

// 功能開關（Beta 期間全部關閉）
export const FEATURE_FLAGS = {
  // 新功能一律關閉
  NEW_FEATURES_ENABLED: false,
  
  // 實驗性功能
  EXPERIMENTAL_UI: false,
  
  // Debug 模式（僅開發環境）
  DEBUG_MODE: process.env.NODE_ENV === 'development',
} as const;











