/**
 * Create Wish Request - Service
 * 独立的创建 Wish 服务，不依赖 packages/core
 * 
 * 流程：
 * 1. 检查 session
 * 2. 处理 assets（normalize + upload）
 * 3. 插入到 wish_requests
 */

import { supabase } from '@/src/lib/supabase';
import { WishCreatePayload, WishCreateResult } from './types';
import { uploadAssetsToWishImagesBucket } from './wishImageUpload';

/**
 * 创建 Wish Request
 * @param payload Wish 数据
 * @param assets expo-image-picker 返回的 asset 数组（可选）
 * @returns 创建结果
 */
export async function createWishRequest(
  payload: WishCreatePayload,
  assets: Array<{ uri: string; mimeType?: string; fileName?: string }> = []
): Promise<WishCreateResult> {
  try {
    // 1. 检查 session（必须存在）
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[createWishRequest] Session error:', sessionError);
      throw new Error(`請先登入：${sessionError.message || '無法取得 session'}`);
    }

    if (!session || !session.user) {
      console.error('[createWishRequest] No session');
      throw new Error('請先登入');
    }

    const userId = session.user.id;
    console.log('[createWishRequest] Session verified, userId:', userId);

    // 2. 验证必填字段
    if (!payload.title || payload.title.trim().length === 0) {
      throw new Error('請輸入需求標題');
    }

    // 3. 处理 assets（normalize + upload）
    let imageUrls: string[] = [];
    
    if (assets && assets.length > 0) {
      console.log('[createWishRequest] Processing assets:', {
        count: assets.length,
        userId,
      });

      try {
        const uploadResults = await uploadAssetsToWishImagesBucket(assets, userId);
        imageUrls = uploadResults.map(r => r.publicUrl);
        
        console.log('[createWishRequest] Assets uploaded successfully:', {
          count: imageUrls.length,
          urls: imageUrls,
        });
      } catch (uploadError: any) {
        // 上传失败，立即 throw（不继续 DB 写入）
        console.error('[createWishRequest] Asset upload failed:', uploadError);
        throw new Error(`圖片上傳失敗：${uploadError.message || '未知錯誤'}`);
      }
    }

    // 4. 准备插入数据
    const insertData: any = {
      title: payload.title.trim(),
      buyer_id: userId,
      status: 'open',
    };

    // 可选字段
    if (payload.description) {
      insertData.description = payload.description.trim();
    }
    if (payload.budget !== undefined && payload.budget !== null) {
      insertData.budget = payload.budget;
    }
    if (payload.price !== undefined && payload.price !== null) {
      insertData.price = payload.price;
    }
    if (payload.commission !== undefined && payload.commission !== null) {
      insertData.commission = payload.commission;
    }
    if (payload.productUrl) {
      insertData.product_url = payload.productUrl.trim();
    }
    if (payload.targetCountry) {
      insertData.target_country = payload.targetCountry;
    }
    if (payload.category) {
      insertData.category = payload.category;
    }
    if (payload.deadline) {
      insertData.deadline = payload.deadline; // YYYY-MM-DD format
    }
    if (payload.isUrgent !== undefined) {
      insertData.is_urgent = payload.isUrgent;
    }
    // images 写入：纯 URL string[] 或 null
    if (imageUrls.length > 0) {
      insertData.images = imageUrls; // Postgres text[]
    } else {
      insertData.images = null;
    }

    // Debug log: DB 写入前
    console.log('[createWishRequest] Before DB insert:', {
      title: insertData.title,
      buyer_id: '[REDACTED]',
      imagesCount: imageUrls.length,
      images: imageUrls,
      hasImages: imageUrls.length > 0,
    });

    // 5. 插入到 Supabase
    const { data, error } = await supabase
      .from('wish_requests')
      .insert([insertData])
      .select('id, title, images, created_at')
      .single();

    // Debug log: DB 写入后
    console.log('[createWishRequest] After DB insert:', {
      hasError: !!error,
      error: error,
      hasData: !!data,
      dataId: data?.id,
      dataImages: data?.images,
    });

    if (error) {
      console.error('[createWishRequest] DB error:', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      throw new Error(`創建失敗：${error.message || '無法連接到伺服器'}`);
    }

    if (!data) {
      throw new Error('創建失敗：未返回數據');
    }

    // 验证返回的 images 是否正确
    console.log('[createWishRequest] DB insert successful:', {
      id: data.id,
      title: data.title,
      imagesCount: Array.isArray(data.images) ? data.images.length : 0,
      images: data.images,
      created_at: data.created_at,
    });

    return {
      success: true,
      wish: {
        id: data.id,
        title: data.title,
        images: Array.isArray(data.images) ? data.images : undefined,
        created_at: data.created_at,
      },
    };
  } catch (error: any) {
    console.error('[createWishRequest] Exception:', {
      error: error.message || error,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || '創建失敗：發生未知錯誤',
    };
  }
}
