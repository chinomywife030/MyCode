-- ============================================
-- 🔧 修復 profiles.email 欄位同步問題
-- 
-- 問題：profiles 表可能沒有 email 欄位，或 email 未同步
-- 導致報價通知無法發送（會顯示 "Buyer has no email"）
-- 
-- 執行方式：在 Supabase SQL Editor 中執行
-- ============================================

-- 1. 確保 profiles 表有 email 欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 從 auth.users 同步現有用戶的 email
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id 
  AND (p.email IS NULL OR p.email = '');

-- 3. 建立 trigger 自動同步 email（新用戶註冊時）
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新 profiles 表的 email
  UPDATE profiles 
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊的 trigger（如果存在）
DROP TRIGGER IF EXISTS trigger_sync_user_email ON auth.users;

-- 建立新的 trigger（在 auth.users 更新時同步 email）
CREATE TRIGGER trigger_sync_user_email
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- 4. 建立一個 helper function 來獲取用戶 email（可被 RPC 呼叫）
CREATE OR REPLACE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- 先從 profiles 查
  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;
  
  IF v_email IS NOT NULL AND v_email != '' THEN
    RETURN v_email;
  END IF;
  
  -- 如果 profiles 沒有，從 auth.users 查
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  -- 同時同步到 profiles
  IF v_email IS NOT NULL THEN
    UPDATE profiles SET email = v_email WHERE id = p_user_id;
  END IF;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 驗證修復結果
DO $$
DECLARE
  v_total INTEGER;
  v_with_email INTEGER;
  v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM profiles;
  SELECT COUNT(*) INTO v_with_email FROM profiles WHERE email IS NOT NULL AND email != '';
  v_missing := v_total - v_with_email;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📧 Profiles Email 同步結果';
  RAISE NOTICE '========================================';
  RAISE NOTICE '總用戶數: %', v_total;
  RAISE NOTICE '有 email: %', v_with_email;
  RAISE NOTICE '缺少 email: %', v_missing;
  RAISE NOTICE '========================================';
  
  IF v_missing > 0 THEN
    RAISE NOTICE '⚠️ 有 % 個用戶缺少 email，可能是他們的 auth.users 記錄已被刪除', v_missing;
  ELSE
    RAISE NOTICE '✅ 所有用戶都有 email';
  END IF;
END $$;

-- 6. 顯示幾個測試用戶的 email 狀態（不顯示完整 email，只顯示是否有）
SELECT 
  id,
  name,
  CASE 
    WHEN email IS NOT NULL AND email != '' THEN '✅ 有 email'
    ELSE '❌ 無 email'
  END as email_status
FROM profiles
ORDER BY created_at DESC
LIMIT 10;



















