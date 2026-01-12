/**
 * @bangbuy/core - Trips (行程) 模組
 * 
 * 提供行程相關的 CRUD 操作
 */

import { getSupabaseClient } from '../client';
import type { Trip, CreateTripParams, CreateTripResult } from '../types';

// ============================================
// 讀取操作（直接使用 Supabase）
// ============================================

/**
 * 獲取行程列表（支援搜索和篩選）
 */
export async function getTrips(options?: {
  limit?: number;
  keyword?: string;
  sortBy?: 'newest' | 'date_asc' | 'date_desc';
}): Promise<Trip[]> {
  const supabase = getSupabaseClient();
  const { limit = 50, keyword, sortBy = 'newest' } = options || {};

  try {
    let query = supabase
      .from('trips')
      .select(`
        id,
        shopper_id,
        destination,
        description,
        start_date,
        end_date,
        created_at,
        profiles:shopper_id (
          id,
          name,
          avatar_url,
          is_supporter
        )
      `)
      .limit(limit);
    
    // 排除已刪除的行程（description 以 "[DELETED]" 開頭）
    // 注意：Supabase 的 not() 方法不支援 'like'，我們需要在應用層過濾
    // 或者使用 .or('description.is.null,description.not.like.[DELETED]%')
    // 但更簡單的方法是在應用層過濾

    // 搜索（使用 ilike 在 destination 和 description 上）
    if (keyword && keyword.trim()) {
      query = query.or(`destination.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }

    // 排序
    switch (sortBy) {
      case 'date_asc':
        query = query.order('start_date', { ascending: true });
        break;
      case 'date_desc':
        query = query.order('start_date', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error('[core/getTrips] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    // 過濾掉已刪除的行程（description 以 "[DELETED]" 開頭）
    const validTrips = (data || []).filter((item: any) => {
      const desc = item.description || '';
      return !desc.startsWith('[DELETED]');
    });

    const trips: Trip[] = validTrips.map((item: any) => ({
      id: item.id,
      shopperId: item.shopper_id,
      destination: item.destination || '',
      description: item.description || undefined,
      startDate: item.start_date || undefined,
      endDate: item.end_date || undefined,
      createdAt: item.created_at,
      owner: item.profiles ? {
        id: item.profiles.id,
        name: item.profiles.name || '匿名用戶',
        avatarUrl: item.profiles.avatar_url || undefined,
        isSupporter: item.profiles.is_supporter || false,
      } : undefined,
    }));

    return trips;
  } catch (error) {
    console.error('[core/getTrips] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

/**
 * 根據 ID 獲取單筆行程
 */
export async function getTripById(id: string): Promise<Trip | undefined> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        id,
        shopper_id,
        destination,
        description,
        start_date,
        end_date,
        created_at,
        profiles:shopper_id (
          id,
          name,
          avatar_url,
          is_supporter
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[core/getTripById] Error:', error);
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return undefined;
      }
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    if (!data) {
      return undefined;
    }

    // 檢查是否已刪除（description 以 "[DELETED]" 開頭）
    const desc = data.description || '';
    if (desc.startsWith('[DELETED]')) {
      return undefined;
    }

    const profiles = data.profiles as any;
    return {
      id: data.id,
      shopperId: data.shopper_id,
      destination: data.destination || '',
      description: data.description || undefined,
      startDate: data.start_date || undefined,
      endDate: data.end_date || undefined,
      createdAt: data.created_at,
      owner: profiles ? {
        id: profiles.id,
        name: profiles.name || '匿名用戶',
        avatarUrl: profiles.avatar_url || undefined,
        isSupporter: profiles.is_supporter || false,
      } : undefined,
    };
  } catch (error) {
    console.error('[core/getTripById] Exception:', error);
    if (error instanceof Error) throw error;
    throw new Error('載入失敗：發生未知錯誤');
  }
}

// ============================================
// 寫入操作（使用 Supabase）
// ============================================

/**
 * 創建行程
 * 
 * 注意：此操作需要用戶已登入
 */
export async function createTrip(params: CreateTripParams): Promise<CreateTripResult> {
  const supabase = getSupabaseClient();

  try {
    // 驗證必填欄位
    if (!params.destination || !params.destination.trim()) {
      return { success: false, error: '目的地為必填欄位' };
    }

    if (!params.startDate) {
      return { success: false, error: '開始日期為必填欄位' };
    }

    // 確保日期格式為 YYYY-MM-DD（移除時間部分，如果有的話）
    const formatDate = (dateStr: string | undefined): string | null => {
      if (!dateStr) return null;
      // 如果已經是 YYYY-MM-DD 格式，直接返回
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // 如果是 ISO datetime，提取日期部分
      return dateStr.split('T')[0];
    };

    const startDateFormatted = formatDate(params.startDate);
    const endDateFormatted = formatDate(params.endDate);

    // 獲取當前用戶
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: '請先登入' };
    }

    // 確保 Profile 存在
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const shopperName = profile?.name || user.email?.split('@')[0] || 'User';

    // 確保 Profile 存在
    await supabase.from('profiles').upsert({
      id: user.id,
      name: shopperName,
      is_shopper: true,
    }, { onConflict: 'id' });

    // 創建 trip
    // date 欄位必須有值，使用 start_date（開始日期）
    const { data, error } = await supabase
      .from('trips')
      .insert([{
        destination: params.destination.trim(),
        date: startDateFormatted, // date NOT NULL，使用 start_date
        start_date: startDateFormatted, // 同步寫入 start_date
        end_date: endDateFormatted, // 同步寫入 end_date（可能為 null）
        description: params.description?.trim() || null,
        shopper_id: user.id, // 使用目前登入的 user.id
        shopper_name: shopperName,
      }])
      .select()
      .single();

    if (error) {
      console.error('[core/createTrip] Error:', error);
      return { success: false, error: `創建失敗：${error.message || '未知錯誤'}` };
    }

    if (!data) {
      return { success: false, error: '創建失敗：未收到回應' };
    }

    return {
      success: true,
      trip: {
        id: data.id,
        shopperId: data.shopper_id,
        destination: data.destination || '',
        description: data.description || undefined,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        createdAt: data.created_at,
      },
    };
  } catch (error: any) {
    console.error('[core/createTrip] Exception:', error);
    return { success: false, error: error.message || '創建失敗：發生未知錯誤' };
  }
}

// ============================================
// 工具函式
// ============================================

/**
 * 格式化日期範圍顯示
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch {
      return dateStr;
    }
  };

  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  if (startDate) {
    return formatDate(startDate);
  }
  if (endDate) {
    return formatDate(endDate);
  }
  return '';
}




