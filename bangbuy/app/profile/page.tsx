'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Profile } from '@/types';
import { uploadAvatar, updateProfileAvatar, validateImageFile } from '@/lib/avatarUpload';
import { useToast } from '@/components/Toast';

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  // Debug 模式（僅 dev）
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isDev = process.env.NODE_ENV === 'development';
  
  // 頭像上傳相關狀態
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    // 清除超時的輔助函數
    const clearTimeoutSafe = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    async function fetchProfile() {
      console.log('[profile] mount');
      
      // 設定 8 秒超時
      timeoutId = setTimeout(() => {
        if (isMounted && !isCompleted) {
          console.error('[profile] timeout - 8 seconds exceeded');
          setLoadError('載入逾時，請重新整理頁面');
          setLoading(false);
          isCompleted = true;
        }
      }, 8000);

      try {
        console.log('[profile] session start');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        console.log('[profile] session', { 
          hasUser: !!authUser, 
          userId: authUser?.id,
          email: authUser?.email,
          authError: authError?.message || null
        });

        if (!isMounted) {
          clearTimeoutSafe();
          return;
        }

        if (authError) {
          console.error('[profile] auth error', authError);
          clearTimeoutSafe();
          setLoadError('驗證失敗：' + authError.message);
          setLoading(false);
          isCompleted = true;
          return;
        }

        if (!authUser) {
          console.log('[profile] no user, redirecting to login');
          clearTimeoutSafe();
          setLoading(false);
          isCompleted = true;
          router.push('/login');
          return;
        }
        
        setUser(authUser);

        console.log('[profile] profile fetch start', { userId: authUser.id });
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        console.log('[profile] profile fetch', { 
          hasProfile: !!profileData,
          error: profileError?.message || null,
          profileId: profileData?.id,
          name: profileData?.name,
        });

        if (!isMounted) {
          clearTimeoutSafe();
          return;
        }

        if (profileError) {
          console.error('[profile] profile fetch error', profileError);
          clearTimeoutSafe();
          setLoadError('無法載入個人資料：' + profileError.message);
          setLoading(false);
          isCompleted = true;
          return;
        }

        // 設定 profile（即使是 null 也要處理）
        setProfile(profileData);
        if (profileData) {
          setName(profileData.name || profileData.display_name || '');
        }
        
        console.log('[profile] load complete', {
          hasProfile: !!profileData,
          profileId: profileData?.id,
          name: profileData?.name,
        });
        
        clearTimeoutSafe();
        setLoading(false);  // ⚠️ 關鍵：成功路徑也要設定 loading=false
        isCompleted = true;
      } catch (err: any) {
        console.error('[profile] unexpected error', err);
        clearTimeoutSafe();
        if (isMounted) {
          setLoadError('發生錯誤：' + (err.message || '未知錯誤'));
        }
        isCompleted = true;
      } finally {
        clearTimeoutSafe();
        if (isMounted && !isCompleted) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
      clearTimeoutSafe();
    };
  }, [router]);

  // 處理頭像檔案選擇
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');

    // 驗證檔案
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setAvatarError(validation.error || '檔案格式不正確');
      return;
    }

    // 設定檔案和預覽
    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  // 處理頭像上傳
  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) {
      setAvatarError('請選擇圖片');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      // 上傳到 Storage
      const uploadResult = await uploadAvatar(user.id, avatarFile);
      if (!uploadResult.success || !uploadResult.url) {
        setAvatarError(uploadResult.error || '上傳失敗');
        setUploadingAvatar(false);
        return;
      }

      // 更新 profiles 表
      const updateResult = await updateProfileAvatar(user.id, uploadResult.url);
      if (!updateResult.success) {
        setAvatarError(updateResult.error || '更新失敗');
        setUploadingAvatar(false);
        return;
      }

      // 更新本地狀態
      setProfile({ ...profile, avatar_url: uploadResult.url } as Profile);
      
      // 清除預覽和檔案
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // 觸發全域刷新（通知 Navbar 等組件更新）
      window.dispatchEvent(new CustomEvent('avatar-updated'));
      
      // 短暫延遲後刷新頁面以確保所有地方都更新
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      console.error('[AvatarUpload] Error:', err);
      setAvatarError(err.message || '上傳時發生錯誤');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 取消頭像變更
  const handleAvatarCancel = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLastError(null);

    // 驗證用戶必須存在
    if (!user || !user.id) {
      const errorMsg = '用戶未登入，請重新登入';
      console.error('[profile-save] No user found');
      setError(errorMsg);
      showToast('error', errorMsg);
      return;
    }

    // 防呆：檢查 name 是否存在且不為空
    if (!name || name.trim() === '') {
      const errorMsg = '名稱為必填';
      setError(errorMsg);
      showToast('error', errorMsg);
      return;
    }

    const trimmedName = name.trim();

    // 驗證名稱長度
    if (trimmedName.length < 2) {
      const errorMsg = '名稱至少需要 2 個字元';
      setError(errorMsg);
      showToast('error', errorMsg);
      return;
    }

    if (trimmedName.length > 20) {
      const errorMsg = '名稱最多 20 個字元';
      setError(errorMsg);
      showToast('error', errorMsg);
      return;
    }

    // 日誌：開始
    console.log('[profile-save] start', { 
      name: trimmedName,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    setSaving(true);
    try {
      // 使用 upsert 確保 row 存在，並回傳資料
      // 明確指定 name 欄位（NOT NULL constraint）
      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          { 
            id: user.id, 
            name: trimmedName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (upsertError) {
        console.error('[profile-save] error', {
          error: upsertError,
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
        });
        setLastError(upsertError.message || '儲存失敗');
        const errorMsg = upsertError.message || '儲存失敗，請稍後再試';
        setError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      if (!data) {
        const errorMsg = '儲存成功但未回傳資料';
        console.error('[profile-save] error', { error: 'No data returned' });
        setLastError(errorMsg);
        setError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      // 日誌：成功
      console.log('[profile-save] success', {
        data,
        name: data.name,
        updated_at: data.updated_at,
        timestamp: new Date().toISOString(),
      });

      // 更新本地狀態（立即刷新 UI）
      setProfile(data as Profile);
      setName(data.name || '');
      setLastSavedAt(new Date());
      setLastError(null);

      // 顯示成功提示
      showToast('success', '儲存成功');

      // 不需要 reload，因為已經更新本地狀態
      // 如果需要通知其他組件（如 Navbar），可以 dispatch event
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: data }));

    } catch (err: any) {
      console.error('[profile-save] error (exception)', {
        error: err,
        message: err.message,
        stack: err.stack,
      });
      const errorMsg = err.message || '儲存失敗，請稍後再試';
      setLastError(errorMsg);
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        載入會員資料…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <div className="text-red-500 text-center">
          <p className="text-lg font-bold mb-2">載入失敗</p>
          <p className="text-sm">{loadError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          重新載入
        </button>
        <a href="/login" className="text-blue-600 hover:underline text-sm">
          前往登入
        </a>
      </div>
    );
  }

  // 沒有登入（user 為 null）
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">請先登入</p>
          <p className="text-sm">你需要登入才能查看個人檔案</p>
        </div>
        <a 
          href="/login" 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          前往登入
        </a>
      </div>
    );
  }

  // 已登入但沒有 profile（需要建立）
  if (!profile) {
    const handleCreateProfile = async () => {
      console.log('[profile] creating profile for user', user.id);
      setSaving(true);
      try {
        const fallbackName = user.email?.split('@')[0] || '新用戶';
        const { data, error: createError } = await supabase
          .from('profiles')
          .upsert(
            { 
              id: user.id, 
              display_name: fallbackName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select()
          .single();

        if (createError) {
          console.error('[profile] create error', createError);
          showToast('error', '建立個人資料失敗：' + createError.message);
          return;
        }

        console.log('[profile] created', data);
        setProfile(data);
        setName(data.name || '');
        showToast('success', '個人資料已建立');
      } catch (err: any) {
        console.error('[profile] create exception', err);
        showToast('error', '建立失敗：' + err.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">找不到個人資料</p>
          <p className="text-sm">尚未建立個人檔案，點擊下方按鈕建立</p>
        </div>
        <button
          onClick={handleCreateProfile}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {saving ? '建立中...' : '建立個人資料'}
        </button>
        <a href="/" className="text-blue-600 hover:underline text-sm">
          返回首頁
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          ← 返回首頁
        </a>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">個人檔案設定</h1>

          {/* 頭像與顯示名稱預覽 */}
          <div className="text-center mb-8 pb-8 border-b border-gray-100">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-gray-100 shadow-sm bg-gray-200">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar preview" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                    {profile?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {/* 點擊頭像也能觸發檔案選擇 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full rounded-full opacity-0 hover:opacity-100 bg-black/20 transition-opacity cursor-pointer flex items-center justify-center"
                disabled={uploadingAvatar}
                aria-label="更換頭像"
              >
                <span className="text-white text-xs font-bold">更換</span>
              </button>
            </div>
            
            {/* 頭像上傳控制 */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
                disabled={uploadingAvatar}
              />
              
              {!avatarFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition"
                >
                  更換照片
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {uploadingAvatar ? '上傳中...' : '儲存'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAvatarCancel}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    取消
                  </button>
                </div>
              )}
              
              {avatarError && (
                <p className="text-xs text-red-600">{avatarError}</p>
              )}
              {!avatarFile && (
                <p className="text-xs text-gray-500">支援 PNG、JPG、WEBP，最大 5MB</p>
              )}
            </div>
            
            <div className="mb-2">
              <p className="font-bold text-gray-800 text-lg">
                {name || profile?.name || profile?.display_name || '未設定名稱'}
              </p>
              {profile?.is_supporter && name && !profile?.supporter_badge_hidden && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full">
                    ⭐ Supporter
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                名稱 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="輸入你的名稱（2-20 字元）"
                minLength={2}
                maxLength={20}
                required
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                名稱會顯示在個人檔案和側邊欄中（{name.length}/20）
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Debug 模式（僅 dev） */}
            {isDev && (lastSavedAt || lastError) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-lg">
                <p className="font-bold mb-1">🔍 Debug 資訊（僅開發模式）</p>
                {lastSavedAt && (
                  <p>最後儲存時間: {lastSavedAt.toLocaleString('zh-TW')}</p>
                )}
                {lastError && (
                  <p className="text-red-600">最後錯誤: {lastError}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </form>

          {/* Supporter 狀態 */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            {profile?.is_supporter ? (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <h3 className="font-bold text-gray-800">Supporter 狀態</h3>
                </div>
                <p className="text-sm text-gray-700">
                  你目前是 Supporter，感謝你支持平台的持續維運。
                </p>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-2">成為 Supporter</h3>
                <p className="text-sm text-gray-600 mb-4">
                  支持平台持續發展，獲得專屬 Supporter 徽章。
                </p>
                <Link
                  href="/supporter"
                  className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
                >
                  成為 Supporter
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


