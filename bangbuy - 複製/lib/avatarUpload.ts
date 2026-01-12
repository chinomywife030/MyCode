import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/**
 * 驗證圖片檔案
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // 檢查檔案類型
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '只接受 PNG、JPG、WEBP 格式的圖片',
    };
  }

  // 檢查檔案大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: '圖片大小不能超過 5MB',
    };
  }

  return { valid: true };
}

/**
 * 壓縮圖片到 512x512（可選）
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // 如果 canvas 不可用，返回原檔案
          return;
        }

        // 計算縮放尺寸（保持比例，最大 512x512）
        let width = img.width;
        let height = img.height;
        const maxSize = 512;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 繪製圖片
        ctx.drawImage(img, 0, 0, width, height);

        // 轉換為 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // 如果壓縮失敗，返回原檔案
            }
          },
          file.type,
          0.9 // 品質 90%
        );
      };
      img.onerror = () => resolve(file); // 如果載入失敗，返回原檔案
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file); // 如果讀取失敗，返回原檔案
    reader.readAsDataURL(file);
  });
}

/**
 * 上傳頭像到 Supabase Storage
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 驗證檔案
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 可選：壓縮圖片
    const processedFile = await compressImage(file);

    // 取得副檔名
    const fileExt = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    // 路徑不包含 bucket 名稱，因為已經在 .from('avatars') 中指定
    const filePath = `${userId}/${timestamp}.${fileExt}`;

    // 上傳到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: false, // 不覆蓋，每次都創建新檔案
      });

    if (uploadError) {
      console.error('[AvatarUpload] Upload error:', uploadError);
      return { success: false, error: uploadError.message || '上傳失敗' };
    }

    // 取得 public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return {
      success: true,
      url: data.publicUrl,
    };
  } catch (error: any) {
    console.error('[AvatarUpload] Error:', error);
    return {
      success: false,
      error: error.message || '上傳時發生錯誤',
    };
  }
}

/**
 * 更新 profiles 表的 avatar_url
 */
export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        avatar_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[AvatarUpload] Update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[AvatarUpload] Error:', error);
    return { success: false, error: error.message || '更新失敗' };
  }
}

