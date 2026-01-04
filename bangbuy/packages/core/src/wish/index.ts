/**
 * @bangbuy/core - Wish (需求) 模組
 * 
 * 提供需求相關的 CRUD 操作
 */

import { getSupabaseClient, getApiBaseUrl, getAuthToken } from '../client';
import type { Wish, CreateWishParams, CreateWishResult, WishStatus } from '../types';

// ============================================
// 讀取操作（直接使用 Supabase）
// ============================================

/**
 * 獲取需求列表
 */
export async function getWishes(options?: {
  status?: WishStatus;
  limit?: number;
  keyword?: string;
}): Promise<Wish[]> {
  const supabase = getSupabaseClient();
  const { status = 'open', limit = 50, keyword } = options || {};

  try {
    let query = supabase
      .from('wish_requests')
      .select(`
        id, title, target_country, images, created_at, status, buyer_id,
        budget, price, commission,
        profiles:buyer_id (name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[core/getWishes] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    let wishes: Wish[] = (data || []).map((item: any) => {
      // 處理 profiles join：可能為單一對象或數組（一對一關係通常是單一對象）
      const profiles = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return {
        id: item.id,
        title: item.title || '',
        targetCountry: item.target_country || undefined,
        images: Array.isArray(item.images) ? item.images : undefined,
        status: item.status || undefined,
        buyerId: item.buyer_id || undefined,
        budget: item.budget ? Number(item.budget) : undefined,
        price: item.price ? Number(item.price) : undefined,
        commission: item.commission ? Number(item.commission) : undefined,
        createdAt: item.created_at,
        buyer: profiles ? {
          name: profiles.name || '匿名用戶',
          avatarUrl: profiles.avatar_url || undefined,
        } : undefined,
      };
    });

    // Client-side 關鍵字過濾
    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      wishes = wishes.filter((wish) =>
        wish.title.toLowerCase().includes(lowerKeyword)
      );
    }

    return wishes;
  } catch (error) {
    console.error('[core/getWishes] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

/**
 * 根據 ID 獲取單筆需求
 */
export async function getWishById(id: string): Promise<Wish | undefined> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('wish_requests')
      .select(`
        id, title, description, product_url, budget, price, commission,
        target_country, category, deadline, status, images, created_at, buyer_id,
        profiles:buyer_id (name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[core/getWishById] Error:', error);
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return undefined;
      }
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    if (!data) {
      return undefined;
    }

    const profiles = data.profiles as any;
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
      buyerId: data.buyer_id || undefined,
      images: Array.isArray(data.images) ? data.images : undefined,
      createdAt: data.created_at,
      buyer: profiles ? {
        name: profiles.name || '匿名用戶',
        avatarUrl: profiles.avatar_url || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('[core/getWishById] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

// ============================================
// 寫入操作（使用 Supabase，不需要 API）
// ============================================

/**
 * 創建需求
 * 
 * 注意：此操作需要用戶已登入
 */
export async function createWish(params: CreateWishParams): Promise<CreateWishResult> {
  const supabase = getSupabaseClient();

  try {
    // 獲取當前用戶
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: '請先登入' };
    }

    // 確保 Profile 存在
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: 'buyer',
    }, { onConflict: 'id' });

    // 計算預估總價
    const estimatedTotal = (params.price || 0) + (params.commission || 0);

    // 創建 wish
    const { data, error } = await supabase
      .from('wish_requests')
      .insert([{
        title: params.title.trim(),
        description: params.description?.trim() || null,
        budget: estimatedTotal > 0 ? estimatedTotal : params.budget || null,
        price: params.price || null,
        commission: params.commission || null,
        product_url: params.productUrl?.trim() || null,
        target_country: params.targetCountry || 'JP',
        category: params.category || 'other',
        deadline: params.deadline || null,
        buyer_id: user.id,
        status: 'open',
      }])
      .select()
      .single();

    if (error) {
      console.error('[core/createWish] Error:', error);
      return { success: false, error: `創建失敗：${error.message || '未知錯誤'}` };
    }

    if (!data) {
      return { success: false, error: '創建失敗：未收到回應' };
    }

    // 觸發推播通知（非阻塞，失敗不影響創建）
    try {
      const apiBaseUrl = getApiBaseUrl();
      if (apiBaseUrl) {
        // 非阻塞發送，不等待結果
        fetch(`${apiBaseUrl}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            title: 'BangBuy',
            body: `新需求：${params.title.trim().substring(0, 40)}${params.title.trim().length > 40 ? '...' : ''}`,
            data: {
              type: 'wish_created',
              wishId: data.id,
            },
          }),
        }).catch((pushError) => {
          // 靜默處理錯誤，不影響創建
          console.warn('[core/createWish] Push notification failed (non-critical):', pushError);
        });
      }
    } catch (pushError: any) {
      // 靜默處理錯誤，不影響創建
      console.warn('[core/createWish] Push notification exception (non-critical):', pushError);
    }

    return {
      success: true,
      wish: {
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
      },
    };
  } catch (error: any) {
    console.error('[core/createWish] Exception:', error);
    return { success: false, error: error.message || '創建失敗：發生未知錯誤' };
  }
}

/**
 * 更新需求狀態
 */
export async function updateWishStatus(
  wishId: string,
  status: WishStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase
      .from('wish_requests')
      .update({ status })
      .eq('id', wishId);

    if (error) {
      console.error('[core/updateWishStatus] Error:', error);
      return { success: false, error: `更新失敗：${error.message || '未知錯誤'}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[core/updateWishStatus] Exception:', error);
    return { success: false, error: error.message || '更新失敗：發生未知錯誤' };
  }
}



