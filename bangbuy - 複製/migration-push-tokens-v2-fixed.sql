-- ============================================
-- push_tokens 表（用於存儲 Expo Push Token）
-- 修復版本：處理已存在的表結構衝突
-- ============================================

-- 步驟 1: 檢查並刪除舊的 policy（如果存在）
DROP POLICY IF EXISTS "Service role full access on push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own push_tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own push_tokens" ON push_tokens;

-- 步驟 2: 如果表已存在但結構不對，先刪除舊表（謹慎：會丟失數據）
-- 如果表不存在或結構正確，這行不會執行
DO $$
BEGIN
  -- 檢查表是否存在
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_tokens') THEN
    -- 檢查是否有 token 列
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'push_tokens' 
      AND column_name = 'token'
    ) THEN
      -- 如果沒有 token 列，刪除舊表（會丟失數據，但確保結構正確）
      DROP TABLE IF EXISTS push_tokens CASCADE;
      RAISE NOTICE '已刪除舊的 push_tokens 表（結構不匹配）';
    END IF;
  END IF;
END $$;

-- 步驟 3: 建立 push_tokens 表（如果不存在）
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 步驟 4: 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- 步驟 5: 啟用 RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 步驟 6: 建立 RLS 政策

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

-- 步驟 7: 驗證表結構
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_tokens'
ORDER BY ordinal_position;




