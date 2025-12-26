-- ============================================
-- 🔧 步驟 2：建立 trigger（在步驟 1 確認成功後執行）
-- ============================================

SET search_path = public;

-- 1. 建立通用的 updated_at 函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 為各表建立 trigger

-- wish_requests
CREATE TRIGGER trigger_wish_requests_updated_at
  BEFORE UPDATE ON wish_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- offers
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trips（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips' AND table_schema = 'public') THEN
    EXECUTE 'CREATE TRIGGER trigger_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- profiles
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 驗證
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name
FROM pg_trigger 
WHERE tgname LIKE '%updated_at%'
ORDER BY table_name;

SELECT '✅ 步驟 2 完成：所有 trigger 已建立' AS status;
SELECT '⏭️ 請執行步驟 3：migration-step3-email-system.sql' AS next_step;














