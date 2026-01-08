-- ============================================
-- push_tokens 表（用於存儲 Expo Push Token）
-- ============================================

-- 建立 push_tokens 表
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- 啟用 RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

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

-- 註：執行此 SQL 前請確保已登入 Supabase Dashboard 或使用 supabase CLI


