-- ============================================
-- 🔧 步驟 1：先添加所有缺失的 updated_at 欄位
-- 請先執行這個，確認成功後再執行步驟 2
-- ============================================

SET search_path = public;

-- 1. 先刪除所有可能有問題的 trigger（避免衝突）
DROP TRIGGER IF EXISTS trigger_wish_requests_updated_at ON wish_requests;
DROP TRIGGER IF EXISTS update_wish_requests_updated_at ON wish_requests;
DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- trips trigger（只在表存在時刪除）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips' AND table_schema = 'public') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_trips_updated_at ON trips';
    EXECUTE 'DROP TRIGGER IF EXISTS update_trips_updated_at ON trips';
  END IF;
END $$;

-- user_email_preferences trigger（只在表存在時刪除）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_email_preferences' AND table_schema = 'public') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_email_preferences_updated_at ON user_email_preferences';
    EXECUTE 'DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON user_email_preferences';
  END IF;
END $$;

-- 2. 添加 updated_at 欄位到所有需要的表

-- wish_requests
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE wish_requests SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE wish_requests ALTER COLUMN updated_at SET DEFAULT NOW();

-- offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE offers SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE offers ALTER COLUMN updated_at SET DEFAULT NOW();

-- trips（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ';
    EXECUTE 'UPDATE trips SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE trips ALTER COLUMN updated_at SET DEFAULT NOW()';
  END IF;
END $$;

-- profiles（應該已有，但確認一下）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE profiles SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT NOW();

-- 3. 驗證結果
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'updated_at'
  AND table_name IN ('wish_requests', 'offers', 'trips', 'profiles')
ORDER BY table_name;

SELECT '✅ 步驟 1 完成：所有 updated_at 欄位已添加' AS status;
SELECT '⏭️ 請執行步驟 2：migration-step2-create-triggers.sql' AS next_step;

