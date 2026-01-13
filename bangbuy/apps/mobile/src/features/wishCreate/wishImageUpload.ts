/**
 * Create Wish Request - Image Upload Service
 * 独立的图片上传功能，不依赖 packages/core
 * 
 * 固定使用 bucket: "wish-images"
 * 上传流程：asset.uri -> expo-image-manipulator (转 JPEG) -> fetch blob -> supabase storage upload
 * 
 * 使用现代化 API：
 * - 不使用 readAsStringAsync（已废弃）
 * - 使用 fetch + blob 获取文件内容
 * - 使用 ArrayBuffer 上传到 Supabase Storage
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/src/lib/supabase';
import { NormalizedAsset, UploadResult } from './types';

const BUCKET_NAME = 'wish-images';

/**
 * 规范化 Asset：将所有图片转为 JPEG
 * @param asset expo-image-picker 返回的 asset（只包含 uri，不包含 base64）
 * @returns 规范化后的 asset 信息（统一为 JPEG）
 */
export async function normalizeAssetForUpload(
  asset: { uri: string; mimeType?: string; fileName?: string }
): Promise<NormalizedAsset> {
  // 验证 asset 对象存在
  if (!asset) {
    throw new Error('圖片 asset 不存在（為 null 或 undefined）');
  }

  // 验证 URI（不访问 base64，因为 UI 只传递 uri）
  if (!asset.uri || typeof asset.uri !== 'string' || asset.uri.trim() === '') {
    throw new Error('圖片 URI 不存在或為空');
  }

  const uri = asset.uri;

  // 所有图片都转为 JPEG（quality: 0.8）
  console.log('[normalizeAssetForUpload] Converting to JPEG:', uri.substring(0, 50) + '...');
  
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [], // 不进行任何变换
      {
        compress: 0.8, // 80% 质量
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[normalizeAssetForUpload] Conversion successful:', manipulatedImage.uri.substring(0, 50) + '...');
    
    return {
      uri: manipulatedImage.uri,
      mimeType: 'image/jpeg',
      fileName: 'image.jpg',
    };
  } catch (error: any) {
    console.error('[normalizeAssetForUpload] Conversion failed:', error);
    throw new Error(`圖片轉換失敗：${error.message || '未知錯誤'}`);
  }
}

/**
 * 使用 fetch 获取文件的 ArrayBuffer
 * 这是现代化的方式，不依赖 expo-file-system 的 readAsStringAsync
 * @param uri 文件 URI
 * @returns ArrayBuffer
 */
async function fetchFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  console.log('[fetchFileAsArrayBuffer] Fetching file:', uri.substring(0, 50) + '...');
  
  try {
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('檔案內容為空');
    }
    
    console.log('[fetchFileAsArrayBuffer] File fetched successfully, size:', arrayBuffer.byteLength, 'bytes');
    
    return arrayBuffer;
  } catch (error: any) {
    console.error('[fetchFileAsArrayBuffer] Failed to fetch file:', error);
    throw new Error(`無法讀取圖片檔案：${error.message || '未知錯誤'}`);
  }
}

/**
 * 上传单个 Asset 到 wish-images bucket
 * 使用现代化 API：fetch + ArrayBuffer + Supabase Storage
 * @param input 规范化后的 asset 信息（JPEG）
 * @param userId 用户 ID
 * @param timestamp 时间戳（用于生成唯一路径）
 * @param index 图片索引（用于生成唯一文件名）
 * @returns 上传结果 { path, publicUrl }
 */
export async function uploadAssetToWishImagesBucket(
  input: NormalizedAsset,
  userId: string,
  timestamp: number,
  index: number
): Promise<UploadResult> {
  // 生成文件路径：wishes/{userId}/{timestamp}_{index}.jpg
  const filePath = `wishes/${userId}/${timestamp}_${index}.jpg`;

  // Debug log: 上传前
  console.log('[uploadAssetToWishImagesBucket] Before upload:', {
    bucket: BUCKET_NAME,
    path: filePath,
    contentType: input.mimeType,
    uri: input.uri.substring(0, 50) + '...',
  });

  try {
    // 1. 验证 session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('請先登入');
    }

    // 2. 使用 fetch 获取文件内容（现代化 API，不使用 readAsStringAsync）
    console.log('[uploadAssetToWishImagesBucket] Reading file using fetch...');
    const arrayBuffer = await fetchFileAsArrayBuffer(input.uri);
    
    // 3. 转换为 Uint8Array（Supabase Storage 接受的格式）
    const bytes = new Uint8Array(arrayBuffer);
    
    console.log('[uploadAssetToWishImagesBucket] File read successful, size:', bytes.length, 'bytes');

    // 4. 上传到 Supabase Storage
    console.log('[uploadAssetToWishImagesBucket] Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    // Debug log: 上传后
    console.log('[uploadAssetToWishImagesBucket] After upload:', {
      bucket: BUCKET_NAME,
      path: filePath,
      hasError: !!uploadError,
      hasData: !!uploadData,
    });

    // 5. 严格检查：error 存在或 data.path 不存在，必须 throw
    if (uploadError) {
      const errorMsg = `上傳失敗：${uploadError.message || '未知錯誤'}`;
      console.error('[uploadAssetToWishImagesBucket] Upload error:', {
        bucket: BUCKET_NAME,
        path: filePath,
        error: uploadError,
        errorCode: (uploadError as any).statusCode,
        errorMessage: uploadError.message,
      });
      throw new Error(errorMsg);
    }

    if (!uploadData) {
      const errorMsg = '上傳失敗：未返回上傳數據';
      console.error('[uploadAssetToWishImagesBucket] No upload data:', {
        bucket: BUCKET_NAME,
        path: filePath,
      });
      throw new Error(errorMsg);
    }

    if (!uploadData.path) {
      const errorMsg = '上傳失敗：上傳數據中缺少 path 欄位';
      console.error('[uploadAssetToWishImagesBucket] Missing path in upload data:', {
        bucket: BUCKET_NAME,
        path: filePath,
        uploadData,
      });
      throw new Error(errorMsg);
    }

    // 6. 取得 public URL（使用同一 bucket "wish-images"）
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);
    
    const publicUrl = publicUrlData.publicUrl;

    if (!publicUrl) {
      const errorMsg = '無法取得圖片 URL';
      console.error('[uploadAssetToWishImagesBucket] No public URL:', {
        bucket: BUCKET_NAME,
        path: uploadData.path,
      });
      throw new Error(errorMsg);
    }

    // 添加 cache busting
    const finalUrl = `${publicUrl}?v=${Date.now()}`;

    console.log('[uploadAssetToWishImagesBucket] Upload successful:', {
      bucket: BUCKET_NAME,
      path: uploadData.path,
      publicUrl: finalUrl,
    });

    // 提醒：检查 Supabase Storage RLS Policy
    console.log('[uploadAssetToWishImagesBucket] ⚠️ Storage RLS Check:', {
      message: '如果图片无法显示，请检查 wish-images bucket 的 RLS SELECT policy',
      bucket: BUCKET_NAME,
      requiredPolicy: 'SELECT policy for authenticated users (or public)',
      dashboardUrl: 'Supabase Dashboard > Storage > Policies',
    });

    return {
      path: uploadData.path,
      publicUrl: finalUrl,
    };
  } catch (error: any) {
    console.error('[uploadAssetToWishImagesBucket] Exception:', {
      bucket: BUCKET_NAME,
      path: filePath,
      error: error.message || error,
    });
    throw error; // 重新 throw，不吞掉错误
  }
}

/**
 * 从文件扩展名推断 MIME 类型
 */
function inferContentTypeFromUri(uri: string, providedMimeType?: string): string {
  if (providedMimeType) {
    return providedMimeType;
  }

  const uriLower = uri.toLowerCase();
  if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) {
    return 'image/jpeg';
  }
  if (uriLower.includes('.png')) {
    return 'image/png';
  }
  if (uriLower.includes('.webp')) {
    return 'image/webp';
  }
  // 默认返回 JPEG（因为 normalizeAssetForUpload 会转换为 JPEG）
  return 'image/jpeg';
}

/**
 * 从 URI 或提供的 fileName 生成文件名
 */
function generateFileName(uri: string, providedFileName: string | undefined, userId: string, timestamp: number, index: number): string {
  if (providedFileName) {
    // 确保扩展名是 .jpg（因为 normalizeAssetForUpload 会转换为 JPEG）
    return providedFileName.replace(/\.[^.]+$/, '.jpg');
  }
  // 生成唯一文件名：{userId}/{timestamp}_{index}.jpg
  return `${userId}/${timestamp}_${index}.jpg`;
}

/**
 * 批量上传 Assets
 * @param assets expo-image-picker 返回的 asset 数组（只包含 uri，可能包含 mimeType/fileName）
 * @param userId 用户 ID
 * @returns 上传结果数组
 */
export async function uploadAssetsToWishImagesBucket(
  assets: Array<{ uri: string; mimeType?: string; fileName?: string }>,
  userId: string
): Promise<UploadResult[]> {
  if (!assets || assets.length === 0) {
    return [];
  }

  if (!userId || userId.trim() === '') {
    throw new Error('用戶 ID 不存在');
  }

  // 1. 严格验证和清理输入：过滤无效的 assets
  const invalidIndexes: number[] = [];
  const safeAssets = assets.filter((a, index) => {
    const isValid = a && typeof a.uri === 'string' && a.uri.trim().length > 0;
    if (!isValid) {
      invalidIndexes.push(index);
      console.warn(`[uploadAssetsToWishImagesBucket] Invalid asset at index ${index}:`, {
        asset: a,
        hasUri: !!a?.uri,
        uriType: typeof a?.uri,
        uriLength: a?.uri?.length,
        uri: a?.uri?.substring(0, 50) || 'N/A',
      });
    }
    return isValid;
  });

  // 2. 如果有无效的 assets，记录详细信息并抛出错误
  if (safeAssets.length !== assets.length) {
    const errorMsg = `發現 ${invalidIndexes.length} 個無效的圖片（索引: ${invalidIndexes.join(', ')}）。所有圖片必須包含有效的 URI。`;
    console.error(`[uploadAssetsToWishImagesBucket] ${errorMsg}`, {
      totalAssets: assets.length,
      validAssets: safeAssets.length,
      invalidIndexes,
      invalidAssets: invalidIndexes.map(idx => ({
        index: idx,
        asset: assets[idx],
        uri: assets[idx]?.uri || 'N/A',
      })),
    });
    throw new Error(errorMsg);
  }

  if (safeAssets.length === 0) {
    throw new Error('沒有有效的圖片可以上傳（所有圖片 URI 都無效）');
  }

  const timestamp = Date.now();
  const results: UploadResult[] = [];

  console.log(`[uploadAssetsToWishImagesBucket] Starting upload: ${safeAssets.length} valid assets to bucket '${BUCKET_NAME}'`);

  for (let i = 0; i < safeAssets.length; i++) {
    const asset = safeAssets[i];
    
    // 记录当前处理的 asset 信息
    const contentType = inferContentTypeFromUri(asset.uri, asset.mimeType);
    const fileName = generateFileName(asset.uri, asset.fileName, userId, timestamp, i);
    
    console.log(`[uploadAssetsToWishImagesBucket] Processing asset ${i + 1}/${safeAssets.length}:`, {
      index: i + 1,
      uri: asset.uri.substring(0, 50) + '...',
      contentType,
      fileName,
      hasMimeType: !!asset.mimeType,
      hasFileName: !!asset.fileName,
    });
    
    try {
      // 1. 规范化 asset（转为 JPEG）
      const normalized = await normalizeAssetForUpload(asset);

      // 2. 上传
      const result = await uploadAssetToWishImagesBucket(normalized, userId, timestamp, i);
      results.push(result);

      console.log(`[uploadAssetsToWishImagesBucket] Asset ${i + 1}/${safeAssets.length} uploaded successfully:`, {
        index: i + 1,
        path: result.path,
        publicUrl: result.publicUrl,
      });
    } catch (error: any) {
      // 任何一张失败，立即 throw（不吞掉错误）
      const errorMsg = `第 ${i + 1} 張圖片上傳失敗：${error.message || '未知錯誤'}`;
      console.error(`[uploadAssetsToWishImagesBucket] Upload failed for asset ${i + 1}:`, {
        index: i + 1,
        total: safeAssets.length,
        uri: asset.uri.substring(0, 50) + '...',
        contentType,
        fileName,
        error: error.message || error,
        errorStack: error.stack,
      });
      throw new Error(errorMsg);
    }
  }

  console.log(`[uploadAssetsToWishImagesBucket] All assets uploaded successfully. Total: ${results.length}`);

  return results;
}
