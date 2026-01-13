/**
 * Profile 相關查詢函數
 * 用於獲取用戶統計數據和個人資料
 */

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface ProfileStats {
  wishesCount: number;
  tripsCount: number;
  completedCount: number;
}

export interface UserProfile {
  id: string;
  name?: string;
  display_name?: string;
  avatar_url?: string;
  email?: string;
}

/**
 * 獲取用戶統計數據
 * 使用 auth.uid() 獲取當前用戶ID
 */
export async function getProfileStats(): Promise<ProfileStats> {
  try {
    // 獲取當前用戶ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        wishesCount: 0,
        tripsCount: 0,
        completedCount: 0,
      };
    }
    const userId = user.id;

    // 並行查詢三個 count
    const [wishesResult, tripsResult, completedResult] = await Promise.all([
      // 我的需求 count
      supabase
        .from('wish_requests')
        .select('id', { count: 'exact', head: true })
        .eq('buyer_id', userId),
      
      // 我的行程 count（排除已刪除的行程）
      (async () => {
        try {
          const { data, error } = await supabase
        .from('trips')
            .select('id, description')
            .eq('shopper_id', userId);
          
          if (error) throw error;
          
          // 過濾掉已刪除的行程（description 以 "[DELETED]" 開頭）
          const validTrips = (data || []).filter((trip: any) => {
            const desc = trip.description || '';
            return !desc.startsWith('[DELETED]');
          });
          
          return { count: validTrips.length, error: null };
        } catch (err: any) {
          return { count: 0, error: err };
        }
      })(),
      
      // 已完成 count
      // 判斷欄位優先順序：
      // 1. 優先使用 status='completed'（wish_requests 表有 status 欄位）
      // 2. 若沒有 status 欄位，改用 is_completed=true（如果該欄位存在）
      // 3. 若兩者都不存在，暫時回傳 0（已在註解中說明）
      // 注意：根據 schema，wish_requests 有 status 欄位，可能值為 'open', 'in_progress', 'completed', 'cancelled', 'closed'
      // trips 表可能沒有 status 欄位，所以只計算 wish_requests 的 completed
      (async () => {
        try {
          // 先嘗試使用 status='completed'（優先）
          const statusResult = await supabase
            .from('wish_requests')
            .select('id', { count: 'exact', head: true })
            .eq('buyer_id', userId)
            .eq('status', 'completed');
          
          // 如果查詢成功且沒有錯誤，返回結果
          if (!statusResult.error && statusResult.count !== null && statusResult.count !== undefined) {
            return statusResult;
          }
          
          // 如果 status 查詢失敗（可能是欄位不存在），嘗試使用 is_completed
          const isCompletedResult = await supabase
            .from('wish_requests')
            .select('id', { count: 'exact', head: true })
            .eq('buyer_id', userId)
            .eq('is_completed', true);
          
          // 如果 is_completed 查詢成功，返回結果
          if (!isCompletedResult.error && isCompletedResult.count !== null && isCompletedResult.count !== undefined) {
            return isCompletedResult;
          }
          
          // 若兩者都不存在或都失敗，暫時回傳 0
          // 根據實際 schema，目前只有 status 欄位，所以此情況不會發生
          return { count: 0, error: null };
        } catch (error) {
          console.error('[getProfileStats] Completed count error:', error);
          return { count: 0, error };
        }
      })(),
    ]);

    return {
      wishesCount: wishesResult.count || 0,
      tripsCount: tripsResult.count || 0,
      completedCount: completedResult.count || 0,
    };
  } catch (error) {
    console.error('[getProfileStats] Error:', error);
    return {
      wishesCount: 0,
      tripsCount: 0,
      completedCount: 0,
    };
  }
}

/**
 * 獲取當前用戶的 Profile 資料
 * 從 profiles 表讀取，fallback 到 auth.user
 * Session Guard：若 session 不存在，直接 return null，不 throw error
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  try {
    // Session Guard：先檢查 session，避免 AuthSessionMissingError
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // 不記錄 AuthSessionMissingError（這是正常情況）
      if (!sessionError.message?.includes('Auth session missing') && 
          !sessionError.message?.includes('AuthSessionMissingError')) {
        console.error('[getCurrentProfile] Session error:', sessionError);
      }
      return null;
    }
    
    if (!session) {
      // 沒有 session，表示未登入
      return null;
    }
    
    // 確認 session 存在後，獲取用戶資訊
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      // 如果錯誤是 session 相關，直接返回 null（不 throw）
      if (userError.message?.includes('Auth session missing') || 
          userError.message?.includes('AuthSessionMissingError')) {
        return null;
      }
      console.error('[getCurrentProfile] Get user error:', userError);
      return null;
    }
    
    if (!user) {
      return null;
    }

    // 從 profiles 表讀取
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // 如果 profiles 表沒有資料，返回基本資訊
      return {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || '用戶',
        display_name: user.user_metadata?.display_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
        email: user.email,
      };
    }

    return {
      id: profile.id,
      name: profile.name,
      display_name: profile.display_name || profile.name,
      avatar_url: profile.avatar_url,
      email: user.email,
    };
  } catch (error: any) {
    // Session Guard：捕獲 AuthSessionMissingError，不 throw
    if (error?.message?.includes('Auth session missing') || 
        error?.name === 'AuthSessionMissingError' ||
        error?.message?.includes('AuthSessionMissingError')) {
      // 這是正常情況（未登入或 session 已失效），不需要記錄為錯誤
      return null;
    }
    console.error('[getCurrentProfile] Error:', error);
    return null;
  }
}

/**
 * 更新用戶的 display_name
 */
export async function updateDisplayName(displayName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '未登入' };
    }

    // 更新 profiles 表的 display_name
    // 如果 display_name 欄位不存在，則更新 name 欄位
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      // 如果 display_name 欄位不存在，嘗試更新 name
      const { error: nameError } = await supabase
        .from('profiles')
        .update({ 
          name: displayName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (nameError) {
        console.error('[updateDisplayName] Error:', nameError);
        return { success: false, error: nameError.message || '更新失敗' };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateDisplayName] Exception:', error);
    return { success: false, error: error.message || '更新失敗' };
  }
}

/**
 * 上傳頭像到 Supabase Storage（React Native 版本）
 * @param imageUri 圖片 URI（從 expo-image-picker 取得）
 * @returns 成功返回 public URL（含 cache busting），失敗返回錯誤訊息
 */
export async function uploadAvatarFromUri(imageUri: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '未登入' };
    }

    // 1. 使用 expo-file-system 讀取圖片為 base64
    console.log('[uploadAvatarFromUri] Reading image as base64 from:', imageUri);
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    
    if (!base64 || base64.length === 0) {
      return { success: false, error: '無法讀取圖片檔案或檔案為空' };
    }
    
    console.log('[uploadAvatarFromUri] Base64 length:', base64.length);

    // 2. 使用 base64-arraybuffer 將 base64 解碼為 ArrayBuffer，然後轉為 Uint8Array
    const arrayBuffer = decode(base64);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    if (uint8Array.length === 0) {
      return { success: false, error: '解碼後的圖片資料為空' };
    }
    
    console.log('[uploadAvatarFromUri] Bytes length:', uint8Array.length, 'bytes');

    // 3. 固定使用 image/jpeg（本輪先求能跑）
    const contentType = 'image/jpeg';
    const fileExt = 'jpg';
    
    console.log('[uploadAvatarFromUri] Content type:', contentType, 'file extension:', fileExt);

    // 4. 生成檔案路徑：avatars/<userId>/<timestamp>.jpg
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}.${fileExt}`;
    console.log('[uploadAvatarFromUri] Uploading to path:', filePath);

    // 5. 上傳 Uint8Array 到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, uint8Array, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false, // 不覆蓋，每次都創建新檔案
      });

    if (uploadError) {
      console.error('[uploadAvatarFromUri] Upload error:', uploadError);
      
      // 如果是權限錯誤，提供更詳細的錯誤訊息
      if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        return { 
          success: false, 
          error: `上傳失敗：權限被拒絕。請確認 Storage RLS Policy 已設定：\n- INSERT policy for bucket 'avatars'\n- 路徑格式：avatars/${user.id}/*` 
        };
      }
      
      return { success: false, error: uploadError.message || '上傳失敗' };
    }

    console.log('[uploadAvatarFromUri] Upload success, data:', uploadData);

    // 6. 取得 public URL
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;
    
    console.log('[uploadAvatarFromUri] Public URL:', publicUrl);
    console.log('[uploadAvatarFromUri] File path:', filePath);
    console.log('[uploadAvatarFromUri] Content-Type:', contentType);
    
    // 驗證 URL 格式
    if (!publicUrl || !publicUrl.includes('avatars') || !publicUrl.includes(user.id)) {
      console.error('[uploadAvatarFromUri] Invalid public URL format:', publicUrl);
      return { 
        success: false, 
        error: `無效的 URL 格式：${publicUrl}\n請確認 bucket 'avatars' 是否存在且為 public` 
      };
    }
    
    // 添加 cache busting query string
    const finalUrl = `${publicUrl}?v=${timestamp}`;
    
    console.log('[uploadAvatarFromUri] Final URL:', finalUrl);

    return {
      success: true,
      url: finalUrl,
    };
  } catch (error: any) {
    console.error('[uploadAvatarFromUri] Exception:', error);
    return { success: false, error: error.message || '上傳時發生錯誤' };
  }
}

/**
 * 更新用戶的 avatar_url
 */
export async function updateAvatarUrl(avatarUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '未登入' };
    }

    // 更新 profiles 表的 avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[updateAvatarUrl] Error:', updateError);
      
      // 如果是權限錯誤，提供更詳細的錯誤訊息
      if (updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
        return { 
          success: false, 
          error: `更新失敗：權限被拒絕。請確認 profiles 表的 RLS Policy 已設定：\n- UPDATE policy for profiles\n- 條件：id = auth.uid()` 
        };
      }
      
      return { success: false, error: updateError.message || '更新失敗' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateAvatarUrl] Exception:', error);
    return { success: false, error: error.message || '更新失敗' };
  }
}

