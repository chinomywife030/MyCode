-- ============================================
-- 修復 notifications 表的 RLS 政策（最小可用版本）
-- ============================================

SET search_path = public;

-- 1. 確保 RLS 已啟用
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. 授予 authenticated 角色權限（必須）
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- 3. 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- 4. 建立 SELECT policy：只能讀取 user_id = auth.uid() 的通知
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. 建立 UPDATE policy：只能更新 user_id = auth.uid() 的通知
-- 允許更新 is_read 和 read_at 欄位
-- 注意：應用層應確保只將 is_read 從 false 改為 true，不允許改回 false
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 驗證
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'notifications' AND schemaname = 'public';
  
  RAISE NOTICE '✅ notifications 表有 % 個 RLS policies', policy_count;
  
  IF policy_count >= 2 THEN
    RAISE NOTICE '✅ RLS 政策設置完成';
  ELSE
    RAISE WARNING '⚠️ 預期至少 2 個 policies，但只找到 % 個', policy_count;
  END IF;
END $$;

-- 7. 顯示當前 policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications' AND schemaname = 'public'
ORDER BY policyname;

