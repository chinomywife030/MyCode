-- ============================================
-- 修復 favorites 表 RLS Policies
-- 確保收藏功能可以正常運作
-- ============================================

-- 1. 確保 favorites 表存在
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wish_id UUID NOT NULL REFERENCES wish_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wish_id)
);

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_wish_id ON favorites(wish_id);

-- 3. 啟用 RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 4. 刪除舊的 policies（如果存在）
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
DROP POLICY IF EXISTS "Public favorites are viewable by everyone" ON favorites;
DROP POLICY IF EXISTS "Users can update own favorites" ON favorites;

-- 5. 建立正確的 RLS Policies

-- SELECT: 用戶只能讀取自己的收藏
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: 用戶只能插入自己的收藏（且 user_id 必須等於 auth.uid()）
CREATE POLICY "Users can create favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 用戶只能刪除自己的收藏
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- UPDATE: 用戶可以更新自己的收藏（雖然通常不需要，但為了完整性）
CREATE POLICY "Users can update own favorites"
  ON favorites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 確保 updated_at trigger 存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD AND NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_favorites_updated_at ON favorites;
CREATE TRIGGER trigger_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 驗證：查詢 policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'favorites';










