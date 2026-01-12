-- ============================================
-- 新增顯示名稱與 Supporter 徽章功能
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 1. 新增 display_name 欄位
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. 新增 is_supporter 欄位
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_supporter BOOLEAN DEFAULT FALSE;

-- 3. 新增 supporter_badge_hidden 欄位（可選）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supporter_badge_hidden BOOLEAN DEFAULT FALSE;

-- 4. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_is_supporter ON profiles(is_supporter);

-- 完成！
SELECT 'Migration completed: display_name, is_supporter, and supporter_badge_hidden added to profiles table' AS status;



















