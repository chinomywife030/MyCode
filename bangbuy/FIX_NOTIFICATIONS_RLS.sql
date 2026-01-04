-- ============================================
-- 修復 notifications 表的 RLS 政策
-- ============================================

-- 1. 確保 notifications 表存在
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deep_link TEXT,
  dedupe_key TEXT,
  actor_id UUID
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key);

-- 3. 啟用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Deny direct insert for users" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

-- 5. 建立新的 RLS policies

-- SELECT: 用戶只能查看自己的通知
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE: 用戶只能更新自己的通知
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT: 允許系統插入（透過 service role 或 trigger）
-- 注意：這個 policy 允許所有 INSERT，但實際使用時應該透過 service role 或 trigger
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 6. 建立 RPC 函數（使用 SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 100,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF notifications AS $$
BEGIN
  IF p_before IS NULL THEN
    RETURN QUERY
    SELECT * FROM notifications
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT * FROM notifications
    WHERE user_id = auth.uid()
      AND created_at < p_before
    ORDER BY created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 驗證 policies 和 RPC 函數是否正確設置
DO $$
DECLARE
  policy_count INTEGER;
  rpc_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'notifications';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_notifications'
  ) INTO rpc_exists;
  
  RAISE NOTICE 'Notifications table has % policies', policy_count;
  RAISE NOTICE 'RPC function get_notifications exists: %', rpc_exists;
END $$;

