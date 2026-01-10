-- ============================================
-- 修復頭像 Storage 公開讀取問題
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 檢查 avatars bucket 是否存在
-- 注意：bucket 的 public 設定需要在 Dashboard 手動設定，無法用 SQL 修改
-- 請前往 Supabase Dashboard → Storage → avatars → Settings
-- 確認 "Public bucket" 選項已開啟

-- 2. 確保 Storage RLS Policy 允許公開讀取
-- 刪除舊的 policy（如果存在）
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 創建新的公開讀取 policy
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 3. 確保用戶可以上傳自己的頭像
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. 確保用戶可以更新自己的頭像
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. 確保用戶可以刪除自己的頭像
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. 驗證 policy 已建立
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
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 完成！
SELECT 'Storage policies for avatars bucket have been created/updated!' AS status;




