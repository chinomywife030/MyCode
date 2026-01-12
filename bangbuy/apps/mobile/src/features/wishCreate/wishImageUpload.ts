/**
 * Create Wish Request - Image Upload Service
 * 独立的图片上传功能，不依赖 packages/core
 * 
 * 固定使用 bucket: "wish-images"
 * 上传流程：asset.uri -> expo-image-manipulator (转 JPEG) -> expo-file-system.uploadAsync
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/src/lib/supabase';
import { NormalizedAsset, UploadResult } from './types';

const BUCKET_NAME = 'wish-images';

/**
 * 规范化 Asset：将所有图片转为 JPEG
 * @param asset expo-image-picker 返回的 asset
 * @returns 规范化后的 asset 信息（统一为 JPEG）
 */
export async function normalizeAssetForUpload(
  asset: { uri: string; mimeType?: string; fileName?: string }
): Promise<NormalizedAsset> {
  // 验证 URI
  if (!asset.uri || asset.uri.trim() === '') {
    throw new Error('圖片 URI 不存在或為空');
  }

  const uri = asset.uri;

  // 所有图片都转为 JPEG（quality: 0.8）
  console.log('[normalizeAssetForUpload] Converting to JPEG:', uri);
  
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [], // 不进行任何变换
      {
        compress: 0.8, // 80% 质量
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('[normalizeAssetForUpload] Conversion successful:', manipulatedImage.uri);
    
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
 * 上传单个 Asset 到 wish-images bucket
 * 使用 expo-file-system.uploadAsync
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
    // 1. 获取 Supabase Storage upload URL
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('請先登入');
    }

    // 2. 构建上传 URL（Supabase Storage REST API）
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL 未配置');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wishImageUpload.ts:96',message:'Checking FileSystem API before upload',data:{hasFileSystem:!!FileSystem,hasUploadAsync:typeof FileSystem.uploadAsync==='function',fileSystemKeys:Object.keys(FileSystem||{}).slice(0,15)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 3. 使用 expo-file-system 读取文件为 base64，然后使用 Supabase Storage upload
    // 因为 uploadAsync 的 API 可能在不同版本中不同，改用更可靠的方式
    console.log('[uploadAssetToWishImagesBucket] Reading file as base64...');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wishImageUpload.ts:102',message:'Reading file as base64',data:{uri:input.uri.substring(0,50)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const base64 = await FileSystem.readAsStringAsync(input.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64 || base64.length === 0) {
      throw new Error('無法讀取圖片檔案或檔案為空');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wishImageUpload.ts:112',message:'Base64 read successful, converting to Uint8Array',data:{base64Length:base64.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // 4. 将 base64 转换为 Uint8Array（使用 atob 和 Uint8Array）
    // React Native 环境支持 atob
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wishImageUpload.ts:122',message:'Uploading to Supabase Storage',data:{bytesLength:bytes.length,filePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // 5. 使用 Supabase Storage upload（直接使用 Uint8Array）
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'wishImageUpload.ts:133',message:'Upload result',data:{hasError:!!uploadError,hasData:!!uploadData,errorMessage:uploadError?.message,dataPath:uploadData?.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    const uploadResult = {
      status: uploadError ? 500 : 200,
      body: uploadError ? JSON.stringify({ error: uploadError.message }) : JSON.stringify(uploadData || {}),
    };

    // Debug log: 上传后
    console.log('[uploadAssetToWishImagesBucket] After upload:', {
      bucket: BUCKET_NAME,
      path: filePath,
      hasError: !!uploadError,
      hasData: !!uploadData,
    });

    // 6. 严格检查：error 存在或 data.path 不存在，必须 throw
    if (uploadError) {
      const errorMsg = `上傳失敗：${uploadError.message || '未知錯誤'}`;
      console.error('[uploadAssetToWishImagesBucket] Upload error:', {
        bucket: BUCKET_NAME,
        path: filePath,
        error: uploadError,
        errorCode: uploadError.statusCode,
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
 * 批量上传 Assets
 * @param assets expo-image-picker 返回的 asset 数组
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

  const timestamp = Date.now();
  const results: UploadResult[] = [];

  console.log(`[uploadAssetsToWishImagesBucket] Starting upload: ${assets.length} assets to bucket '${BUCKET_NAME}'`);

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    
    try {
      // 1. 规范化 asset（转为 JPEG）
      const normalized = await normalizeAssetForUpload(asset);

      // 2. 上传
      const result = await uploadAssetToWishImagesBucket(normalized, userId, timestamp, i);
      results.push(result);

      console.log(`[uploadAssetsToWishImagesBucket] Asset ${i + 1}/${assets.length} uploaded successfully:`, {
        path: result.path,
        publicUrl: result.publicUrl,
      });
    } catch (error: any) {
      // 任何一张失败，立即 throw（不吞掉错误）
      const errorMsg = `第 ${i + 1} 張圖片上傳失敗：${error.message || '未知錯誤'}`;
      console.error(`[uploadAssetsToWishImagesBucket] Upload failed for asset ${i + 1}:`, {
        index: i + 1,
        total: assets.length,
        error: error.message || error,
      });
      throw new Error(errorMsg);
    }
  }

  console.log(`[uploadAssetsToWishImagesBucket] All assets uploaded successfully. Total: ${results.length}`);

  return results;
}
