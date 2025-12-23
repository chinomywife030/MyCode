'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Profile } from '@/types';
import { uploadAvatar, updateProfileAvatar, validateImageFile } from '@/lib/avatarUpload';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  
  // 頭像上傳相關狀態
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || '');
      }
      setLoading(false);
    }
    fetchProfile();
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

    // 驗證顯示名稱
    if (!displayName.trim()) {
      setError('顯示名稱為必填');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('顯示名稱至少需要 2 個字元');
      return;
    }

    if (displayName.trim().length > 20) {
      setError('顯示名稱最多 20 個字元');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 更新本地狀態
      setProfile({ ...profile, display_name: displayName.trim() } as Profile);
      
      // 成功後硬重整以確保資料同步
      window.location.reload();
    } catch (err: any) {
      setError(err.message || '儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        載入中...
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
                {displayName || profile?.display_name || '未設定名稱'}
              </p>
              {profile?.is_supporter && displayName && !profile?.supporter_badge_hidden && (
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
              <label htmlFor="display_name" className="block text-sm font-bold text-gray-700 mb-2">
                顯示名稱 <span className="text-red-500">*</span>
              </label>
              <input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="輸入你的顯示名稱（2-20 字元）"
                minLength={2}
                maxLength={20}
                required
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                顯示名稱會顯示在個人檔案和側邊欄中（{displayName.length}/20）
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
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
                disabled={saving || !displayName.trim()}
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


