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
 * 獲取行程列表
 */
export async function getTrips(options?: {
  limit?: number;
  keyword?: string;
}): Promise<Trip[]> {
  const supabase = getSupabaseClient();
  const { limit = 50, keyword } = options || {};

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
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[core/getTrips] Error:', error);
      throw new Error(`載入失敗：${error.message || '無法連接到伺服器'}`);
    }

    let trips: Trip[] = (data || []).map((item: any) => ({
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

    // Client-side 關鍵字過濾
    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      trips = trips.filter((trip) =>
        trip.destination.toLowerCase().includes(lowerKeyword) ||
        (trip.description && trip.description.toLowerCase().includes(lowerKeyword)) ||
        (trip.owner?.name && trip.owner.name.toLowerCase().includes(lowerKeyword))
      );
    }

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
    const { data, error } = await supabase
      .from('trips')
      .insert([{
        destination: params.destination.trim(),
        description: params.description?.trim() || null,
        start_date: params.startDate || null,
        end_date: params.endDate || null,
        shopper_id: user.id,
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




