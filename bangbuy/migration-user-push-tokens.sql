-- ============================================
-- 📱 BangBuy - User Push Tokens 表
-- 支援多裝置 Expo Push Token 註冊
-- ============================================

SET search_path = public;

-- 1. 建立 user_push_tokens 表
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expo_push_token)
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_expo_token ON user_push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- 3. 啟用 RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. 建立 RLS 政策
-- 政策 1：用戶只能讀取自己的 token
DROP POLICY IF EXISTS "Users can read own tokens" ON user_push_tokens;
CREATE POLICY "Users can read own tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- 政策 2：用戶只能插入自己的 token
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_push_tokens;
CREATE POLICY "Users can insert own tokens"
  ON user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 政策 3：用戶只能更新自己的 token
DROP POLICY IF EXISTS "Users can update own tokens" ON user_push_tokens;
CREATE POLICY "Users can update own tokens"
  ON user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 政策 4：用戶只能刪除自己的 token
DROP POLICY IF EXISTS "Users can delete own tokens" ON user_push_tokens;
CREATE POLICY "Users can delete own tokens"
  ON user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 驗證
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_push_tokens'
ORDER BY ordinal_position;

SELECT '✅ user_push_tokens 表已創建！' AS status;





