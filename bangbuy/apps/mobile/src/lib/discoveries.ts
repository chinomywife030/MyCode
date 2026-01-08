/**
 * Discoveries 模組
 * 處理旅途發現相關的數據獲取
 */

import { supabase } from './supabase';

export interface Discovery {
  id: string;
  user_id: string;
  title: string;
  country: string;
  city?: string;
  description?: string;
  photos: string[];
  created_at: string;
  updated_at?: string;
  profiles?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

/**
 * 從 Supabase 獲取旅途發現列表
 */
export async function getDiscoveries(options?: {
  limit?: number;
}): Promise<Discovery[]> {
  try {
    // ✅ 允許未登入也能讀取 discoveries（RLS policy 已允許 anon 讀取）
    // ✅ 修復：使用 author_id 而不是 user_id，並使用 join 查詢一次性獲取 profiles
    let query = supabase
      .from('discoveries')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: discoveriesData, error: discoveriesError } = await query;

    if (discoveriesError) {
      // ✅ 添加詳細錯誤日誌
      console.error('[getDiscoveries] Error fetching discoveries:', discoveriesError);
      console.error('[getDiscoveries] Error details:', {
        code: discoveriesError.code,
        message: discoveriesError.message,
        details: discoveriesError.details,
        hint: discoveriesError.hint,
      });
      
      // ✅ 錯誤處理降級：42501 權限錯誤不 throw，返回空陣列
      if (discoveriesError.code === '42501') {
        // console 僅 log 一次（避免 call stack 洗版）
        console.warn('[getDiscoveries] Permission denied (42501)');
        return [];
      }
      
      // 如果是列名錯誤（PGRST204），提供更明確的錯誤信息
      if (discoveriesError.code === 'PGRST204' || discoveriesError.message?.includes('user_id')) {
        console.error('[getDiscoveries] Column name mismatch detected. Database may use "author_id" instead of "user_id".');
      }
      
      throw new Error(discoveriesError.message || '獲取旅途發現失敗');
    }

    if (!discoveriesData || discoveriesData.length === 0) {
      console.log('[getDiscoveries] No discoveries found in database');
      return [];
    }

    // 轉換資料格式並合併 profiles
    // ✅ 修復：將 author_id 映射為 user_id 以保持向後兼容（UI 組件仍使用 user_id）
    // ✅ 處理 Supabase join 返回的 profiles 格式（可能是陣列或單一對象）
    return discoveriesData.map((item: any) => {
      // Supabase join 可能返回 profiles 為陣列或單一對象
      const profile = Array.isArray(item.profiles) 
        ? item.profiles[0] 
        : item.profiles;
      
      const authorId = item.author_id || item.user_id; // 優先使用 author_id
      
      return {
        id: item.id,
        user_id: authorId, // 映射 author_id 為 user_id 以保持向後兼容
        title: item.title,
        country: item.country,
        city: item.city,
        description: item.description,
        photos: item.photos || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        profiles: profile ? {
          id: profile.id,
          name: profile.name || '匿名用戶',
          avatar_url: profile.avatar_url,
        } : undefined,
      };
    });
  } catch (error: any) {
    // ✅ 添加詳細錯誤日誌
    console.error('[getDiscoveries] Exception:', error);
    console.error('[getDiscoveries] Error stack:', error.stack);
    throw error;
  }
}

/**
 * 從 Supabase 根據 id 獲取單筆旅途發現
 * ✅ 允許訪客（未登入）訪問
 * ✅ 使用正確的列名 author_id
 * ✅ 映射 author_id -> user_id 以保持 UI 兼容性
 */
export async function getDiscoveryById(id: string): Promise<Discovery | undefined> {
  try {
    // ✅ 不檢查 auth/user，允許訪客訪問
    // ✅ 修復：使用 author_id 而不是 user_id，並使用 join 查詢一次性獲取 profile
    const { data: discoveryData, error: discoveryError } = await supabase
      .from('discoveries')
      .select(`
        *,
        profiles:author_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (discoveryError) {
      // ✅ 添加詳細錯誤日誌
      console.error('[getDiscoveryById] Error fetching discovery:', discoveryError);
      console.error('[getDiscoveryById] Error details:', {
        code: discoveryError.code,
        message: discoveryError.message,
        details: discoveryError.details,
        hint: discoveryError.hint,
      });
      
      if (discoveryError.code === 'PGRST116') {
        // 找不到記錄
        return undefined;
      }
      
      // ✅ 錯誤處理降級：42501 權限錯誤不 throw，返回 undefined
      if (discoveryError.code === '42501') {
        // console 僅 log 一次（避免 call stack 洗版）
        console.warn('[getDiscoveryById] Permission denied (42501)');
        return undefined;
      }
      
      // 如果是列名錯誤（PGRST204），提供更明確的錯誤信息
      if (discoveryError.code === 'PGRST204' || discoveryError.message?.includes('user_id')) {
        console.error('[getDiscoveryById] Column name mismatch detected. Database may use "author_id" instead of "user_id".');
      }
      
      throw new Error(discoveryError.message || '獲取旅途發現失敗');
    }

    if (!discoveryData) {
      return undefined;
    }

    // ✅ 修復：數據庫列是 author_id，不是 user_id
    const authorId = discoveryData.author_id || discoveryData.user_id; // 優先使用 author_id，fallback 到 user_id（向後兼容）

    // 處理 Supabase join 返回的 profiles 格式（可能是陣列或單一對象）
    const profile = Array.isArray(discoveryData.profiles) 
      ? discoveryData.profiles[0] 
      : discoveryData.profiles;

    // 轉換資料格式
    // ✅ 修復：將 author_id 映射為 user_id 以保持向後兼容（UI 組件仍使用 user_id）
    return {
      id: discoveryData.id,
      user_id: authorId, // 映射 author_id 為 user_id
      title: discoveryData.title,
      country: discoveryData.country,
      city: discoveryData.city,
      description: discoveryData.description,
      photos: discoveryData.photos || [],
      created_at: discoveryData.created_at,
      updated_at: discoveryData.updated_at,
      profiles: profile ? {
        id: profile.id,
        name: profile.name || '匿名用戶',
        avatar_url: profile.avatar_url,
      } : undefined,
    };
  } catch (error: any) {
    console.error('[getDiscoveryById] Exception:', error);
    throw error;
  }
}

