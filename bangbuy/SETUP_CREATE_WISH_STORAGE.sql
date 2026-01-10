-- ============================================
-- CreateWishScreen Storage 設定
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 建立 wish-images Storage Bucket（如果不存在）
-- 注意：這需要在 Supabase Dashboard → Storage 手動建立
-- 或者使用 Supabase CLI：
-- supabase storage create wish-images --public

-- 2. 建立 Storage Policy（允許用戶上傳圖片）

-- 允許所有人讀取圖片（公開讀取）
DROP POLICY IF EXISTS "Wish images are publicly accessible" ON storage.objects;
CREATE POLICY "Wish images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wish-images');

-- 允許已登入用戶上傳圖片到自己的資料夾
DROP POLICY IF EXISTS "Users can upload wish images" ON storage.objects;
CREATE POLICY "Users can upload wish images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'wish-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允許用戶更新自己的圖片
DROP POLICY IF EXISTS "Users can update own wish images" ON storage.objects;
CREATE POLICY "Users can update own wish images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'wish-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允許用戶刪除自己的圖片
DROP POLICY IF EXISTS "Users can delete own wish images" ON storage.objects;
CREATE POLICY "Users can delete own wish images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'wish-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 驗證 policy 已建立
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%wish%'
ORDER BY policyname;

-- 完成！
SELECT 'Storage policies for wish-images bucket have been created!' AS status;




