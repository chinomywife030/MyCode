-- ============================================
-- 📱 BangBuy Mobile - Wish Replies 最小行動閉環
-- 建立 wish_replies 表（MVP 版本）
-- 完整 Migration Script - 可直接在 Supabase SQL Editor 執行
-- ============================================

SET search_path = public;

-- ============================================
-- 1. 建立 wish_replies 表
-- ============================================

CREATE TABLE IF NOT EXISTS wish_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wish_id UUID NOT NULL REFERENCES wish_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wish_replies_wish_id ON wish_replies(wish_id);
CREATE INDEX IF NOT EXISTS idx_wish_replies_created_at ON wish_replies(created_at DESC);

-- ============================================
-- 3. 授予權限（重要：允許匿名用戶插入）
-- ============================================

-- 授予 anon 角色權限（匿名用戶）
GRANT SELECT, INSERT ON wish_replies TO anon;

-- 授予 authenticated 角色權限（已登入用戶）
GRANT SELECT, INSERT ON wish_replies TO authenticated;

-- ============================================
-- 4. 啟用 RLS (Row Level Security)
-- ============================================

ALTER TABLE wish_replies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. 建立 RLS 政策
-- ============================================

-- 政策 1：任何人都可以讀取（包括匿名用戶）
DROP POLICY IF EXISTS "Anyone can read wish_replies" ON wish_replies;
CREATE POLICY "Anyone can read wish_replies"
  ON wish_replies
  FOR SELECT
  USING (true);

-- 政策 2：任何人都可以插入（MVP 允許匿名，user_id 可為 null）
DROP POLICY IF EXISTS "Anyone can insert wish_replies" ON wish_replies;
CREATE POLICY "Anyone can insert wish_replies"
  ON wish_replies
  FOR INSERT
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
WHERE table_name = 'wish_replies'
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
WHERE tablename = 'wish_replies';
