-- ============================================
-- 修復 user_push_tokens 表 RLS 策略
-- 確保 App 端可以成功 insert ExpoPushToken
-- ============================================

SET search_path = public;

-- 1. 確保表存在
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expo_push_token)
);

-- 2. 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_expo_token ON user_push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- 3. 授予 authenticated 角色權限（必須）
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;

-- 4. 確保 RLS 已啟用
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- 5. 刪除所有舊的 policy（確保乾淨）
DROP POLICY IF EXISTS "Users can read own tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON user_push_tokens;

-- 6. 建立新的 RLS 政策

-- 政策 1：SELECT - 用戶只能讀取自己的 token
CREATE POLICY "Users can read own tokens"
  ON user_push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 政策 2：INSERT - 用戶只能插入自己的 token
CREATE POLICY "Users can insert own tokens"
  ON user_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 政策 3：UPDATE - 用戶只能更新自己的 token
CREATE POLICY "Users can update own tokens"
  ON user_push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 政策 4：DELETE - 用戶只能刪除自己的 token
CREATE POLICY "Users can delete own tokens"
  ON user_push_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. 驗證 RLS 狀態
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_push_tokens';

-- 8. 驗證 RLS 政策
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
WHERE schemaname = 'public'
  AND tablename = 'user_push_tokens'
ORDER BY cmd, policyname;

-- 9. 驗證權限
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'user_push_tokens'
  AND grantee = 'authenticated'
ORDER BY privilege_type;

-- 10. 顯示完成狀態
SELECT 
  '✅ user_push_tokens RLS 已修復！' AS status,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') AS select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') AS insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') AS delete_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_push_tokens';



