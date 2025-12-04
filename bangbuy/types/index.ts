// types/index.ts

export type OrderStatus = 'pending' | 'accepted' | 'purchased' | 'shipped' | 'completed' | 'cancelled';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'buyer' | 'shopper';
  is_shopper: boolean;
  verification_status: VerificationStatus;
  student_card_url?: string;
  rating_avg: number;
  rating_count: number;
  deals_count?: number; // 成交數
  bio?: string;
  // 關聯欄位
  reviews?: Review[];
}

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
  status?: string;
  images?: string[];
  created_at?: string;
  // 關聯欄位 (從 Supabase join 查詢取得)
  buyer?: {
    name: string;
    avatar_url?: string;
  };
  profiles?: {
    name: string;
    avatar_url?: string;
  };
}

export interface Order {
  id: string;
  wish_id: string;
  buyer_id: string;
  shopper_id: string;
  status: OrderStatus;
  price: number;
  created_at: string;
  // 關聯資料
  wish_requests?: WishRequest;
  profiles?: Profile; // Shopper
  buyer_profile?: Profile; // Buyer
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    name: string;
    avatar_url?: string;
  };
}

export interface Trip {
  id: string;
  destination: string;
  date: string;
  description?: string;
  shopper_id: string;
  shopper_name?: string;
  created_at?: string;
  // 關聯欄位 (從 Supabase join 查詢取得)
  shopper?: {
    name: string;
    avatar_url?: string;
  };
  profiles?: {
    name: string;
    avatar_url?: string;
  };
}