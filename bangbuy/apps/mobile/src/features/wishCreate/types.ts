/**
 * Create Wish Request - Types
 * 独立的类型定义，不依赖 packages/core
 */

export interface WishCreatePayload {
  title: string;
  description?: string;
  budget?: number;
  price?: number;
  commission?: number;
  productUrl?: string;
  targetCountry?: string;
  category?: string;
  deadline?: string; // YYYY-MM-DD
  isUrgent?: boolean;
  images?: string[]; // publicUrl 数组
}

export interface WishCreateResult {
  success: boolean;
  wish?: {
    id: string;
    title: string;
    images?: string[];
    created_at: string;
  };
  error?: string;
}

export interface NormalizedAsset {
  uri: string;
  mimeType: string;
  fileName: string;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}
