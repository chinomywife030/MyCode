/**
 * @bangbuy/core - 共用 Domain/Data Access Layer
 * 
 * 供 Web (Next.js) 和 Mobile (Expo) 共用的商業邏輯與資料存取層
 */

// ============================================
// Client 設定
// ============================================

export {
  setSupabaseClient,
  getSupabaseClient,
  setApiBaseUrl,
  getApiBaseUrl,
  setGetAuthToken,
  getAuthToken,
  isClientInitialized,
} from './client';

// ============================================
// Types
// ============================================

export * from './types';

// ============================================
// Wish 模組
// ============================================

export {
  getWishes,
  getWishById,
  createWish,
  updateWishStatus,
} from './wish';

// ============================================
// Trips 模組
// ============================================

export {
  getTrips,
  getTripById,
  createTrip,
  formatDateRange,
} from './trips';

// ============================================
// Messaging 模組
// ============================================

export {
  getConversations,
  getMessages,
  sendMessage,
  getOrCreateConversation,
  markAsRead,
  blockUser,
  unblockUser,
} from './messaging';





