-- ============================================
-- 📱 BangBuy - Push Tokens 表
-- 支援多裝置 Expo Push Token 註冊
-- ============================================

SET search_path = public;

-- 1. 建立 push_tokens 表
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expo_push_token)
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_expo_token ON push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

-- 3. 授予 authenticated 角色權限
GRANT SELECT, INSERT, UPDATE, DELETE ON push_tokens TO authenticated;

-- 4. 啟用 RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 5. 建立 RLS 政策
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;
CREATE POLICY "Users can read own tokens"
  ON push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
CREATE POLICY "Users can insert own tokens"
  ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
CREATE POLICY "Users can update own tokens"
  ON push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tokens" ON push_tokens;
CREATE POLICY "Users can delete own tokens"
  ON push_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. 驗證
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_tokens'
ORDER BY ordinal_position;

SELECT '✅ push_tokens 表已創建！' AS status;


