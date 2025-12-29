import { supabase } from './supabase';

export type Wish = {
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
  createdAt?: string;
};

/**
 * 從 Supabase 獲取所有 wishes（列表頁用，只取必要欄位）
 */
export async function getWishes(): Promise<Wish[]> {
  try {
    const { data, error } = await supabase
      .from('wish_requests')
      .select('id, title, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[getWishes] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    return (data || []).map((item) => ({
      id: item.id,
      title: item.title || '',
      createdAt: item.created_at,
    }));
  } catch (error) {
    console.error('[getWishes] Exception:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('載入失敗：發生未知錯誤');
  }
}

/**
 * 從 Supabase 根據 id 獲取單筆 wish（詳情頁用，取完整欄位）
 */
export async function getWishById(id: string): Promise<Wish | undefined> {
  try {
    const { data, error } = await supabase
      .from('wish_requests')
      .select('id, title, description, product_url, budget, price, commission, target_country, category, deadline, status, created_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[getWishById] Error:', error);
      // 如果是 406 (PGRST116) 或找不到資料，返回 undefined（不是錯誤）
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return undefined;
      }
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    if (!data) {
      return undefined;
    }

    return {
      id: data.id,
      title: data.title || '',
      description: data.description || undefined,
      productUrl: data.product_url || undefined,
      budget: data.budget ? Number(data.budget) : undefined,
      price: data.price ? Number(data.price) : undefined,
      commission: data.commission ? Number(data.commission) : undefined,
      targetCountry: data.target_country || undefined,
      category: data.category || undefined,
      deadline: data.deadline || undefined,
      status: data.status || undefined,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('[getWishById] Exception:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('載入失敗：發生未知錯誤');
  }
}

