/**
 * @bangbuy/core - 共用型別定義
 * 
 * 與 types/index.ts 保持一致
 */

// ============================================
// 基礎類型
// ============================================

export type OrderStatus = 'pending' | 'accepted' | 'purchased' | 'shipped' | 'completed' | 'cancelled';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type WishStatus = 'open' | 'in_progress' | 'closed' | 'completed' | 'cancelled';

// ============================================
// Profile
// ============================================

export interface Profile {
  id: string;
  name: string;
  display_name?: string | null;
  avatar_url?: string;
  role: 'buyer' | 'shopper';
  is_shopper: boolean;
  verification_status: VerificationStatus;
  student_card_url?: string;
  rating_avg: number;
  rating_count: number;
  deals_count?: number;
  bio?: string;
  is_supporter?: boolean;
  supporter_badge_hidden?: boolean;
}

// ============================================
// Wish (需求)
// ============================================

export interface WishRequest {
  id?: string;
  title: string;
  description?: string;
  budget?: number;
  price?: number;
  commission?: number;
  product_url?: string;
  is_urgent?: boolean;
  target_country?: string;
  category?: string;
  deadline?: string;
  buyer_id?: string;
  status?: WishStatus | string;
  images?: string[];
  created_at?: string;
  updated_at?: string;
  // 關聯欄位
  buyer?: {
    name: string;
    avatar_url?: string;
  };
  profiles?: {
    name: string;
    avatar_url?: string;
  };
}

/** 簡化的 Wish 型別（用於列表和 Mobile App） */
export interface Wish {
  id: string;
  title: string;
  description?: string;
  productUrl?: string;
  budget?: number;
  price?: number;
  commission?: number;
  targetCountry?: string;
  category?: string;
  deadline?: string;
  status?: string;
  buyerId?: string;
  images?: string[];
  createdAt?: string;
  // 關聯
  buyer?: {
    name: string;
    avatarUrl?: string;
  };
}

export interface CreateWishParams {
  title: string;
  description?: string;
  budget?: number;
  price?: number;
  commission?: number;
  productUrl?: string;
  targetCountry?: string;
  category?: string;
  deadline?: string;
}

export interface CreateWishResult {
  success: boolean;
  wish?: Wish;
  error?: string;
}

// ============================================
// Trip (行程)
// ============================================

export interface TripRecord {
  id: string;
  destination: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  shopper_id: string;
  shopper_name?: string;
  created_at?: string;
  // 關聯欄位
  shopper?: {
    name: string;
    avatar_url?: string;
    is_supporter?: boolean;
  };
  profiles?: {
    name: string;
    avatar_url?: string;
    is_supporter?: boolean;
  };
}

/** 簡化的 Trip 型別（用於 Mobile App） */
export interface Trip {
  id: string;
  shopperId: string;
  destination: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  owner?: {
    id: string;
    name: string;
    avatarUrl?: string;
    isSupporter?: boolean;
  };
}

export interface CreateTripParams {
  destination: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CreateTripResult {
  success: boolean;
  trip?: Trip;
  error?: string;
}

// ============================================
// Messaging (私訊)
// ============================================

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserAvatar?: string;
  sourceType?: string;
  sourceId?: string;
  sourceTitle?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  isBlocked?: boolean;
  createdAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  clientMessageId?: string;
  status?: 'sending' | 'sent' | 'failed';
  createdAt: string;
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  clientMessageId?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface GetOrCreateConversationParams {
  targetUserId: string;
  sourceType?: 'wish_request' | 'trip' | 'listing' | 'direct';
  sourceId?: string;
  sourceTitle?: string;
}

export interface GetOrCreateConversationResult {
  success: boolean;
  conversationId?: string;
  isNew?: boolean;
  error?: string;
  errorCode?: string;
}

// ============================================
// Order (訂單)
// ============================================

export interface Order {
  id: string;
  wish_id: string;
  buyer_id: string;
  shopper_id: string;
  status: OrderStatus;
  price: number;
  created_at: string;
  wish_requests?: WishRequest;
  profiles?: Profile;
  buyer_profile?: Profile;
}

// ============================================
// API Response 通用型別
// ============================================

export interface ApiResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}




