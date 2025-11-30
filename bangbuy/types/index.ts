// types/index.ts

export type OrderStatus = 'pending' | 'accepted' | 'purchased' | 'shipped' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'buyer' | 'shopper';
  is_shopper: boolean;
  country?: string;
  verified: boolean;
  rating_avg: number;
  rating_count: number;
}

export interface Order {
  id: string;
  wish_id: string;
  buyer_id: string;
  shopper_id: string;
  status: OrderStatus;
  price_final?: number;
  shipping_info?: string;
  created_at: string;
  // 關聯資料 (Join)
  wish_requests?: any; 
  profiles?: Profile; // 指 Shopper
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}