-- ============================================
-- 📱 BangBuy Mobile - Device Tokens 推播 Token 註冊
-- 建立 device_tokens 表
-- 完整 Migration Script - 可直接在 Supabase SQL Editor 執行
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 建立 device_tokens 表
-- ============================================

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  fcm_token TEXT NOT NULL UNIQUE,
  device_id TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_fcm_token ON device_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_last_seen_at ON device_tokens(last_seen_at DESC);

-- ============================================
-- 3. 授予權限
-- ============================================

-- 授予 anon 角色權限（匿名用戶）
GRANT SELECT, INSERT, UPDATE ON device_tokens TO anon;

-- 授予 authenticated 角色權限（已登入用戶）
GRANT SELECT, INSERT, UPDATE ON device_tokens TO authenticated;

-- ============================================
-- 4. 啟用 RLS (Row Level Security)
-- ============================================

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. 建立 RLS 政策
-- ============================================

-- 政策 1：用戶可以讀取自己的 token，或任何人都可以讀取（用於管理）
DROP POLICY IF EXISTS "Users can read device tokens" ON device_tokens;
CREATE POLICY "Users can read device tokens"
  ON device_tokens
  FOR SELECT
  USING (true);

-- 政策 2：任何人都可以插入（MVP 允許匿名）
DROP POLICY IF EXISTS "Anyone can insert device tokens" ON device_tokens;
CREATE POLICY "Anyone can insert device tokens"
  ON device_tokens
  FOR INSERT
  WITH CHECK (true);

-- 政策 3：用戶可以更新自己的 token（通過 fcm_token 匹配）
DROP POLICY IF EXISTS "Users can update device tokens" ON device_tokens;
CREATE POLICY "Users can update device tokens"
  ON device_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 完成
-- ============================================

-- 驗證：查詢表結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'device_tokens'
ORDER BY ordinal_position;

-- 驗證：查詢 RLS 政策
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
WHERE tablename = 'device_tokens';






