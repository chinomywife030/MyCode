/**
 * Discoveries 模組
 * 處理旅途發現相關的數據獲取和操作
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
 * ✅ 自動排除已軟刪除的項目（deleted_at is null）
 */
export async function getDiscoveries(options?: {
  limit?: number;
}): Promise<Discovery[]> {
  try {
    // ✅ 允許未登入也能讀取 discoveries（RLS policy 已允許 anon 讀取）
    // ✅ 修復：使用 author_id 而不是 user_id，並使用 join 查詢一次性獲取 profiles
    // ✅ 排除已軟刪除的項目（如果 deleted_at 欄位存在）
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
      .is('deleted_at', null) // 排除已軟刪除的項目（如果欄位不存在，Supabase 會報錯，但我們在 catch 中處理）
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
      
      // ✅ 如果 deleted_at 欄位不存在（PGRST204），重新查詢不帶 deleted_at 過濾
      if (discoveriesError.code === 'PGRST204' && discoveriesError.message?.includes('deleted_at')) {
        console.log('[getDiscoveries] deleted_at column does not exist, retrying without filter');
        const { data: retryData, error: retryError } = await supabase
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
        
        if (retryError) {
          console.error('[getDiscoveries] Retry error:', retryError);
          return [];
        }
        
        // 使用重試的資料繼續處理
        const mappedData = (retryData || []).map((item: any) => {
          const profile = Array.isArray(item.profiles) 
            ? item.profiles[0] 
            : item.profiles;
          
          const authorId = item.author_id || item.user_id;
          
          return {
            id: item.id,
            user_id: authorId,
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
        
        return mappedData;
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
    // ✅ 排除已軟刪除的項目（如果 deleted_at 欄位存在）
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
      .eq('id', id)
      .is('deleted_at', null) // 排除已軟刪除的項目
      .single();
    
    const { data: discoveryData, error: discoveryError } = await query;

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
      
      // ✅ 如果 deleted_at 欄位不存在，重新查詢不帶 deleted_at 過濾
      if (discoveryError.code === 'PGRST204' && discoveryError.message?.includes('deleted_at')) {
        console.log('[getDiscoveryById] deleted_at column does not exist, retrying without filter');
        const { data: retryData, error: retryError } = await supabase
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
        
        if (retryError) {
          if (retryError.code === 'PGRST116') {
            return undefined;
          }
          console.error('[getDiscoveryById] Retry error:', retryError);
          return undefined;
        }
        
        // 使用重試的資料繼續處理
        const authorId = retryData.author_id || retryData.user_id;
        const profile = Array.isArray(retryData.profiles) 
          ? retryData.profiles[0] 
          : retryData.profiles;
        
        return {
          id: retryData.id,
          user_id: authorId,
          title: retryData.title,
          country: retryData.country,
          city: retryData.city,
          description: retryData.description,
          photos: retryData.photos || [],
          created_at: retryData.created_at,
          updated_at: retryData.updated_at,
          profiles: profile ? {
            id: profile.id,
            name: profile.name || '匿名用戶',
            avatar_url: profile.avatar_url,
          } : undefined,
        };
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

/**
 * 獲取當前用戶的旅途發現列表
 * ✅ 只返回當前用戶的 discoveries
 * ✅ 自動排除已軟刪除的項目（deleted_at is null）
 */
export async function getMyDiscoveries(): Promise<Discovery[]> {
  try {
    // 1. 獲取當前 session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      return [];
    }

    // 2. 查詢當前用戶的 discoveries
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
      .eq('author_id', session.user.id)
      .is('deleted_at', null) // 排除已軟刪除的項目（如果欄位存在）
      .order('created_at', { ascending: false });

    const { data: discoveriesData, error: discoveriesError } = await query;

    if (discoveriesError) {
      console.error('[getMyDiscoveries] Error fetching discoveries:', discoveriesError);
      
      // 如果 deleted_at 欄位不存在，重新查詢不帶 deleted_at 過濾
      if (discoveriesError.code === 'PGRST204' && discoveriesError.message?.includes('deleted_at')) {
        console.log('[getMyDiscoveries] deleted_at column does not exist, retrying without filter');
        const { data: retryData, error: retryError } = await supabase
          .from('discoveries')
          .select(`
            *,
            profiles:author_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('author_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (retryError) {
          console.error('[getMyDiscoveries] Retry error:', retryError);
          return [];
        }
        
        // 使用重試的資料繼續處理
        const mappedData = (retryData || []).map((item: any) => {
          const profile = Array.isArray(item.profiles) 
            ? item.profiles[0] 
            : item.profiles;
          
          const authorId = item.author_id || item.user_id;
          
          return {
            id: item.id,
            user_id: authorId,
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
        
        return mappedData;
      }
      
      return [];
    }

    if (!discoveriesData || discoveriesData.length === 0) {
      return [];
    }

    // 3. 轉換資料格式
    return discoveriesData.map((item: any) => {
      const profile = Array.isArray(item.profiles) 
        ? item.profiles[0] 
        : item.profiles;
      
      const authorId = item.author_id || item.user_id;
      
      return {
        id: item.id,
        user_id: authorId,
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
    console.error('[getMyDiscoveries] Exception:', error);
    return [];
  }
}

/**
 * 刪除旅途發現
 * ✅ 優先軟刪除：若資料表有 deleted_at 欄位，使用軟刪除
 * ✅ 硬刪除：若沒有 deleted_at 欄位，直接刪除記錄
 * ✅ Storage：軟刪除保留檔案，硬刪除嘗試刪除（失敗不中斷）
 * ✅ 權限檢查：只有作者可以刪除
 */
export async function deleteDiscovery(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 獲取當前 session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      return { success: false, error: '請先登入' };
    }

    // 2. 先獲取 discovery 資料（用於檢查 deleted_at 欄位和刪除 storage 檔案）
    const { data: discoveryData, error: fetchError } = await supabase
      .from('discoveries')
      .select('photos, author_id, deleted_at')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[deleteDiscovery] Error fetching discovery:', fetchError);
      return { success: false, error: '找不到該旅途發現' };
    }

    // 3. 權限檢查：只有作者可以刪除
    if (discoveryData.author_id !== session.user.id) {
      return { success: false, error: '沒有權限刪除此旅途發現' };
    }

    // 4. 檢查是否有 deleted_at 欄位（嘗試軟刪除）
    const hasDeletedAt = discoveryData.deleted_at !== undefined;
    
    if (hasDeletedAt) {
      // 軟刪除：更新 deleted_at
      const { error: updateError } = await supabase
        .from('discoveries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('author_id', session.user.id);

      if (updateError) {
        console.error('[deleteDiscovery] Error soft deleting discovery:', updateError);
        
        if (updateError.code === '42501') {
          return { success: false, error: '權限不足，無法刪除' };
        }
        
        return { success: false, error: updateError.message || '刪除失敗' };
      }

      // 軟刪除成功，不刪除 storage（保留以便復原）
      return { success: true };
    } else {
      // 硬刪除：先嘗試刪除 Storage 檔案（失敗不中斷）
      if (discoveryData.photos && Array.isArray(discoveryData.photos) && discoveryData.photos.length > 0) {
        const bucket = 'discoveries';
        const deletePromises = discoveryData.photos.map(async (photoUrl: string) => {
          try {
            // 從完整 URL 提取檔案路徑
            const urlPattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
            const match = photoUrl.match(urlPattern);
            
            if (match && match[2]) {
              const filePath = match[2];
              const { error: deleteError } = await supabase.storage
                .from(bucket)
                .remove([filePath]);
              
              if (deleteError) {
                console.warn('[deleteDiscovery] Failed to delete storage file:', filePath, deleteError);
                // 不中斷流程，繼續刪除資料庫記錄
              }
            }
          } catch (err) {
            console.warn('[deleteDiscovery] Error deleting storage file:', err);
            // 不中斷流程，繼續刪除資料庫記錄
          }
        });

        await Promise.all(deletePromises);
      }

      // 刪除資料庫記錄
      const { error: deleteError } = await supabase
        .from('discoveries')
        .delete()
        .eq('id', id)
        .eq('author_id', session.user.id);

      if (deleteError) {
        console.error('[deleteDiscovery] Error deleting discovery:', deleteError);
        
        if (deleteError.code === '42501') {
          return { success: false, error: '權限不足，無法刪除' };
        }
        
        return { success: false, error: deleteError.message || '刪除失敗' };
      }

      return { success: true };
    }
  } catch (error: any) {
    console.error('[deleteDiscovery] Exception:', error);
    return { success: false, error: error.message || '刪除失敗' };
  }
}

