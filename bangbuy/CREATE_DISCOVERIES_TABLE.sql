-- ============================================
-- Discoveries 表創建腳本
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 創建 discoveries 表（如果不存在）
CREATE TABLE IF NOT EXISTS discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  description TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果表已存在，檢查並處理列名問題
DO $$
BEGIN
  -- 檢查 user_id 列是否存在
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'discoveries' 
    AND column_name = 'user_id'
  ) THEN
    -- 如果存在 author_id，重命名為 user_id
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'discoveries' 
      AND column_name = 'author_id'
    ) THEN
      ALTER TABLE discoveries RENAME COLUMN author_id TO user_id;
    ELSE
      -- 否則添加 user_id 列
      ALTER TABLE discoveries ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 確保其他必需的列存在
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE discoveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_discoveries_user_id ON discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_created_at ON discoveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discoveries_country ON discoveries(country);

-- 添加 updated_at 自動更新觸發器（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_discoveries_updated_at ON discoveries;
CREATE TRIGGER update_discoveries_updated_at
  BEFORE UPDATE ON discoveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 啟用 Row Level Security (RLS)
ALTER TABLE discoveries ENABLE ROW LEVEL SECURITY;

-- 刪除可能存在的舊 RLS Policies（如果它們引用了不存在的列）
DROP POLICY IF EXISTS "Discoveries are viewable by everyone" ON discoveries;
DROP POLICY IF EXISTS "Users can insert their own discoveries" ON discoveries;
DROP POLICY IF EXISTS "Users can update their own discoveries" ON discoveries;
DROP POLICY IF EXISTS "Users can delete their own discoveries" ON discoveries;

-- RLS Policies: 允許所有人讀取
CREATE POLICY "Discoveries are viewable by everyone"
  ON discoveries FOR SELECT
  USING (true);

-- RLS Policies: 允許已登入用戶插入自己的發現
CREATE POLICY "Users can insert their own discoveries"
  ON discoveries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: 允許用戶更新自己的發現
CREATE POLICY "Users can update their own discoveries"
  ON discoveries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: 允許用戶刪除自己的發現
CREATE POLICY "Users can delete their own discoveries"
  ON discoveries FOR DELETE
  USING (auth.uid() = user_id);
