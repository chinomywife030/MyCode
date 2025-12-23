-- ============================================
-- 📧 BangBuy Email 通知系統（修正版）
-- Migration Script
-- 修正：確保 trigger 函數正確處理 updated_at
-- ============================================

SET search_path = public;

-- ============================================
-- 0. 先建立/更新通用 updated_at 函數
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有當表有 updated_at 欄位時才更新
  IF TG_TABLE_NAME IN ('wish_requests', 'offers', 'user_email_preferences', 'profiles', 'trips', 'orders', 'conversations') THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. 建立 email_outbox 表（去重複與追蹤）
-- ============================================

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT,
  category TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error TEXT,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_email_outbox_user_created ON email_outbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_dedupe ON email_outbox(dedupe_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_category ON email_outbox(category);

-- ============================================
-- 2. 建立 user_email_preferences 表（Email 設定）
-- ============================================

CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  offer_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  accept_reject_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_digest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_email_preferences_updated_at ON user_email_preferences;
CREATE TRIGGER trigger_email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for email preferences
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email preferences" ON user_email_preferences;
CREATE POLICY "Users can view own email preferences"
  ON user_email_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own email preferences" ON user_email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON user_email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own email preferences" ON user_email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON user_email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. 建立 RPC：獲取用戶 Email 設定
-- ============================================

CREATE OR REPLACE FUNCTION get_email_preferences()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prefs RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_prefs
  FROM user_email_preferences
  WHERE user_id = v_user_id;

  -- 如果沒有記錄，返回預設值
  IF v_prefs.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'preferences', jsonb_build_object(
        'offer_notifications', true,
        'accept_reject_notifications', true,
        'message_digest', true
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'preferences', jsonb_build_object(
      'offer_notifications', v_prefs.offer_notifications,
      'accept_reject_notifications', v_prefs.accept_reject_notifications,
      'message_digest', v_prefs.message_digest
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_email_preferences() TO authenticated;

-- ============================================
-- 4. 建立 RPC：更新用戶 Email 設定
-- ============================================

CREATE OR REPLACE FUNCTION update_email_preferences(
  p_offer_notifications BOOLEAN DEFAULT NULL,
  p_accept_reject_notifications BOOLEAN DEFAULT NULL,
  p_message_digest BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Upsert
  INSERT INTO user_email_preferences (
    user_id,
    offer_notifications,
    accept_reject_notifications,
    message_digest
  ) VALUES (
    v_user_id,
    COALESCE(p_offer_notifications, true),
    COALESCE(p_accept_reject_notifications, true),
    COALESCE(p_message_digest, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    offer_notifications = COALESCE(p_offer_notifications, user_email_preferences.offer_notifications),
    accept_reject_notifications = COALESCE(p_accept_reject_notifications, user_email_preferences.accept_reject_notifications),
    message_digest = COALESCE(p_message_digest, user_email_preferences.message_digest),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_email_preferences(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================
-- 5. 建立 RPC：檢查用戶是否允許某類 Email
-- ============================================

CREATE OR REPLACE FUNCTION check_email_preference(
  p_user_id UUID,
  p_category TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  SELECT * INTO v_prefs
  FROM user_email_preferences
  WHERE user_id = p_user_id;

  -- 預設都開啟
  IF v_prefs.id IS NULL THEN
    RETURN true;
  END IF;

  CASE p_category
    WHEN 'offer_created' THEN
      RETURN v_prefs.offer_notifications;
    WHEN 'offer_accepted', 'offer_rejected' THEN
      RETURN v_prefs.accept_reject_notifications;
    WHEN 'message_digest' THEN
      RETURN v_prefs.message_digest;
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 確保 profiles 表有 email 欄位
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 從 auth.users 同步 email（如果為空）
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ============================================
-- 7. 建立 message_digest_queue 表（訊息聚合用）
-- ============================================

CREATE TABLE IF NOT EXISTS message_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  unread_count INTEGER NOT NULL DEFAULT 1,
  last_sender_name TEXT,
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  digest_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 唯一約束：每個用戶每個對話只有一筆
DROP INDEX IF EXISTS idx_message_digest_queue_unique;
CREATE UNIQUE INDEX idx_message_digest_queue_unique
ON message_digest_queue(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_digest_queue_pending
ON message_digest_queue(user_id, digest_sent_at)
WHERE digest_sent_at IS NULL;

-- ============================================
-- 8. 確保關鍵表有 updated_at 欄位並建立 trigger
-- （修復 respond_to_offer RPC 400 錯誤）
-- ============================================

-- wish_requests
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE wish_requests SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE offers SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

-- trips（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    UPDATE trips SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
  END IF;
END $$;

-- 為相關表建立/重建 trigger
DROP TRIGGER IF EXISTS trigger_wish_requests_updated_at ON wish_requests;
DROP TRIGGER IF EXISTS update_wish_requests_updated_at ON wish_requests;
CREATE TRIGGER trigger_wish_requests_updated_at
  BEFORE UPDATE ON wish_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER trigger_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- trips trigger（如果表存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_trips_updated_at ON trips';
    EXECUTE 'DROP TRIGGER IF EXISTS update_trips_updated_at ON trips';
    EXECUTE 'CREATE TRIGGER trigger_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- profiles trigger
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. 驗證修復
-- ============================================

DO $$
DECLARE
  v_has_updated_at BOOLEAN;
  v_has_trigger BOOLEAN;
BEGIN
  -- 檢查 wish_requests 是否有 updated_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wish_requests' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ wish_requests.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ wish_requests.updated_at 欄位不存在';
  END IF;
  
  -- 檢查 offers 是否有 updated_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'updated_at'
  ) INTO v_has_updated_at;
  
  IF v_has_updated_at THEN
    RAISE NOTICE '✅ offers.updated_at 欄位已存在';
  ELSE
    RAISE EXCEPTION '❌ offers.updated_at 欄位不存在';
  END IF;
  
  -- 檢查 trigger 是否存在
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_wish_requests_updated_at'
  ) INTO v_has_trigger;
  
  IF v_has_trigger THEN
    RAISE NOTICE '✅ wish_requests trigger 已建立';
  ELSE
    RAISE WARNING '⚠️ wish_requests trigger 未建立';
  END IF;
END $$;

-- ============================================
-- 完成
-- ============================================

SELECT '✅ Email 系統表已建立' AS status;
SELECT '✅ user_email_preferences 表已建立' AS status;
SELECT '✅ message_digest_queue 表已建立' AS status;
SELECT '✅ Email 相關 RPC 函數已建立' AS status;
SELECT '✅ wish_requests.updated_at 已修復' AS status;
SELECT '✅ 所有 updated_at trigger 已建立' AS status;







