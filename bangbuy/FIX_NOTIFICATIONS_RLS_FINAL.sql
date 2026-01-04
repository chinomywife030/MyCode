-- ============================================
-- 修復 notifications 表的 RLS 政策（最終版）
-- 根據實際欄位：user_id, is_read, read_at
-- ============================================

SET search_path = public;

-- 1. 確保 RLS 已啟用
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. 確保 authenticated 角色有權限（應該已經有了，但確保一下）
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- 3. 刪除所有舊的 policies（避免衝突）
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_deny" ON notifications;
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
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. INSERT policy：只允許 service_role 插入（透過後端 API）
-- 一般用戶不允許直接插入通知
-- 注意：如果需要允許系統插入，可以保留一個允許 INSERT 的 policy
-- 但通常應該透過 service_role 或 trigger 來插入通知

-- 7. 驗證
DO $$
DECLARE
  policy_count INTEGER;
  select_policy_exists BOOLEAN;
  update_policy_exists BOOLEAN;
BEGIN
  -- 檢查 policies 數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'notifications';
  
  -- 檢查 SELECT policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'notifications'
      AND policyname = 'notifications_select_own'
      AND cmd = 'SELECT'
  ) INTO select_policy_exists;
  
  -- 檢查 UPDATE policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'notifications'
      AND policyname = 'notifications_update_own'
      AND cmd = 'UPDATE'
  ) INTO update_policy_exists;
  
  RAISE NOTICE '✅ notifications 表有 % 個 RLS policies', policy_count;
  RAISE NOTICE '✅ SELECT policy 存在: %', select_policy_exists;
  RAISE NOTICE '✅ UPDATE policy 存在: %', update_policy_exists;
  
  IF select_policy_exists AND update_policy_exists THEN
    RAISE NOTICE '✅ RLS 政策設置完成！';
  ELSE
    RAISE WARNING '⚠️ 部分 policies 未正確設置';
  END IF;
END $$;

-- 8. 顯示最終的 policies
SELECT 
  policyname,
  cmd AS command_type,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'notifications'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'UPDATE' THEN 2
    WHEN 'INSERT' THEN 3
    ELSE 4
  END,
  policyname;


