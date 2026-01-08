/**
 * Supabase Storage 圖片上傳工具
 * 用於將 React Native 的圖片 URI 上傳到 Supabase Storage
 */

import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * 上傳圖片到 Supabase Storage
 * @param imageUri 圖片 URI（從 expo-image-picker 取得）
 * @param bucket Storage bucket 名稱
 * @param filePath 檔案路徑（相對於 bucket，例如：wishes/{userId}/{timestamp}/{filename}.jpg）
 * @returns 成功返回 public URL，失敗返回錯誤訊息
 */
export async function uploadImageToStorage(
  imageUri: string,
  bucket: string,
  filePath: string
): Promise<UploadImageResult> {
  try {
    // 1. 讀取圖片為 base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    if (!base64 || base64.length === 0) {
      return { success: false, error: '無法讀取圖片檔案或檔案為空' };
    }

    // 2. 解碼為 Uint8Array
    const arrayBuffer = decode(base64);
    const uint8Array = new Uint8Array(arrayBuffer);

    if (uint8Array.length === 0) {
      return { success: false, error: '解碼後的圖片資料為空' };
    }

    // 3. 判斷圖片類型（優先使用 JPEG，避免 HEIC 問題）
    let contentType = 'image/jpeg';
    const lowerUri = imageUri.toLowerCase();
    if (lowerUri.includes('.png')) {
      contentType = 'image/png';
    } else if (lowerUri.includes('.webp')) {
      contentType = 'image/webp';
    } else if (lowerUri.includes('.heic') || lowerUri.includes('.heif')) {
      // ✅ iOS HEIC/HEIF 格式強制使用 JPEG（應該已經被 normalizeImagesToJpg 轉換）
      console.warn('[uploadImageToStorage] HEIC/HEIF detected, forcing image/jpeg');
      contentType = 'image/jpeg';
    }

    // 4. 上傳到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, uint8Array, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadImageToStorage] Upload error:', uploadError);
      
      if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        return {
          success: false,
          error: `上傳失敗：權限被拒絕。請確認 Storage RLS Policy 已設定：\n- INSERT policy for bucket '${bucket}'\n- 路徑格式：${bucket}/${filePath}`,
        };
      }

      return { success: false, error: uploadError.message || '上傳失敗' };
    }

    // 5. 取得 public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      return { success: false, error: '無法取得圖片 URL' };
    }

    // 添加 cache busting
    const finalUrl = `${publicUrl}?v=${Date.now()}`;

    return {
      success: true,
      url: finalUrl,
    };
  } catch (error: any) {
    console.error('[uploadImageToStorage] Exception:', error);
    return { success: false, error: error.message || '上傳時發生錯誤' };
  }
}

/**
 * 批量上傳圖片
 * @param imageUris 圖片 URI 陣列
 * @param bucket Storage bucket 名稱
 * @param userId 用戶 ID（用於生成路徑）
 * @param wishId 可選的許願單 ID（用於組織路徑）
 * @returns 成功返回 URL 陣列，失敗返回錯誤訊息
 */
export async function uploadMultipleImages(
  imageUris: string[],
  bucket: string,
  userId: string,
  wishId?: string
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  if (!imageUris || imageUris.length === 0) {
    return { success: false, error: '沒有圖片需要上傳' };
  }

  const urls: string[] = [];
  const timestamp = Date.now();
  const wishIdPath = wishId || timestamp.toString();

  console.log(`[uploadMultipleImages] Starting upload: ${imageUris.length} images to bucket '${bucket}'`);

  for (let i = 0; i < imageUris.length; i++) {
    const imageUri = imageUris[i];
    
    if (!imageUri || imageUri.trim() === '') {
      console.warn(`[uploadMultipleImages] Skipping empty URI at index ${i}`);
      continue;
    }

    // ✅ 強制使用 jpg 作為副檔名（所有圖片應該已轉換為 JPG）
    const lowerUri = imageUri.toLowerCase();
    let fileExt = 'jpg';
    if (lowerUri.includes('.png')) {
      fileExt = 'png';
    } else if (lowerUri.includes('.webp')) {
      fileExt = 'webp';
    }
    // HEIC/HEIF 統一使用 jpg
    const filePath = `${userId}/${wishIdPath}/${i}.${fileExt}`;

    console.log(`[uploadMultipleImages] Uploading image ${i + 1}/${imageUris.length}: ${filePath}`);

    const result = await uploadImageToStorage(imageUri, bucket, filePath);

    if (!result.success) {
      console.error(`[uploadMultipleImages] Upload failed for image ${i + 1}:`, result.error);
      return {
        success: false,
        error: `第 ${i + 1} 張圖片上傳失敗：${result.error}`,
      };
    }

    if (result.url) {
      urls.push(result.url);
      console.log(`[uploadMultipleImages] Image ${i + 1} uploaded successfully: ${result.url}`);
    } else {
      console.warn(`[uploadMultipleImages] Image ${i + 1} uploaded but no URL returned`);
    }
  }

  console.log(`[uploadMultipleImages] All images uploaded successfully. Total URLs: ${urls.length}`);

  if (urls.length === 0) {
    return { success: false, error: '所有圖片上傳完成但未取得任何 URL' };
  }

  return {
    success: true,
    urls,
  };
}

