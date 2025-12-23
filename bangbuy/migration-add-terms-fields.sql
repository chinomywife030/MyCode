-- ============================================
-- 🔐 法務條款同意欄位遷移
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 為 profiles 表新增條款同意記錄欄位
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- 為現有用戶設定預設值（假設他們已同意）
-- 可選：如果要強制所有現有用戶重新同意，請註釋掉下面這行
UPDATE profiles 
SET 
  terms_accepted_at = created_at,
  terms_version = '2025-12-13'
WHERE terms_accepted_at IS NULL;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON profiles(terms_accepted_at);

-- 完成！
SELECT 'Migration completed: terms_accepted_at and terms_version added to profiles table' AS status;










