// src/types/index.ts 加入下面這段
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