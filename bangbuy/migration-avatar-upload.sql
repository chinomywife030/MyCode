-- ============================================
-- 頭像上傳功能 Migration
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 確保 profiles 表有 avatar_url 和 avatar_updated_at 欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

-- 2. 建立 avatars Storage Bucket（如果不存在）
-- 注意：這需要在 Supabase Dashboard → Storage 手動建立
-- 或者使用 Supabase CLI：
-- supabase storage create avatars --public

-- 3. 建立 Storage Policy（允許用戶上傳自己的頭像）
-- 注意：這需要在 Supabase Dashboard → Storage → Policies 設定
-- 或者使用以下 SQL（如果使用 RLS）：

-- 允許用戶讀取所有公開頭像
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 允許用戶上傳自己的頭像（只能上傳到自己的資料夾）
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允許用戶更新自己的頭像
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允許用戶刪除自己的頭像
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 驗證
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('avatar_url', 'avatar_updated_at');

SELECT 'Avatar upload migration completed!' AS status;

