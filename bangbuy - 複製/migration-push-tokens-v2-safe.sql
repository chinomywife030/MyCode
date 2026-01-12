-- ============================================
-- push_tokens 表（用於存儲 Expo Push Token）
-- 安全版本：保留舊數據，遷移列名
-- ============================================

-- 步驟 1: 如果表不存在，直接建立
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 步驟 2: 如果表存在但列名是 expo_push_token，重命名列
DO $$
BEGIN
  -- 檢查是否有 expo_push_token 列但沒有 token 列
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'push_tokens' 
    AND column_name = 'expo_push_token'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'push_tokens' 
    AND column_name = 'token'
  ) THEN
    -- 重命名列
    ALTER TABLE push_tokens RENAME COLUMN expo_push_token TO token;
    RAISE NOTICE '已將 expo_push_token 列重命名為 token';
  END IF;
END $$;

-- 步驟 3: 確保所有必需的列都存在
DO $$
BEGIN
  -- 如果沒有 user_id 列，添加它
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'push_tokens' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN user_id uuid;
    RAISE NOTICE '已添加 user_id 列';
  END IF;

  -- 如果沒有 platform 列，添加它
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'push_tokens' 
    AND column_name = 'platform'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN platform text;
    RAISE NOTICE '已添加 platform 列';
  END IF;

  -- 如果沒有 updated_at 列，添加它
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'push_tokens' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE '已添加 updated_at 列';
  END IF;
END $$;

-- 步驟 4: 刪除舊的索引（如果存在）
DROP INDEX IF EXISTS idx_push_tokens_expo_token;
DROP INDEX IF EXISTS idx_push_tokens_user_id;

-- 步驟 5: 建立新索引
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- 步驟 6: 刪除舊的 policy（如果存在）
DROP POLICY IF EXISTS "Service role full access on push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON push_tokens;

-- 步驟 7: 啟用 RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 步驟 8: 建立 RLS 政策

-- 允許 service role 完全存取（用於 API server）
CREATE POLICY "Service role full access on push_tokens"
  ON push_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 允許已登入用戶讀取自己的 tokens
CREATE POLICY "Users can read own push_tokens"
  ON push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- 允許已登入用戶新增自己的 tokens
CREATE POLICY "Users can insert own push_tokens"
  ON push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 允許已登入用戶更新自己的 tokens
CREATE POLICY "Users can update own push_tokens"
  ON push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 允許已登入用戶刪除自己的 tokens
CREATE POLICY "Users can delete own push_tokens"
  ON push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- 步驟 9: 驗證表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_tokens'
ORDER BY ordinal_position;




