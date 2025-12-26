-- ============================================
-- 🔧 步驟 3：Email 系統表和 RPC
-- ============================================

SET search_path = public;

-- 1. 建立 email_outbox 表
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

CREATE INDEX IF NOT EXISTS idx_email_outbox_user_created ON email_outbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_dedupe ON email_outbox(dedupe_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);

-- 2. 建立 user_email_preferences 表
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  offer_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  accept_reject_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_digest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_email_preferences_updated_at ON user_email_preferences;
CREATE TRIGGER trigger_email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email preferences" ON user_email_preferences;
CREATE POLICY "Users can view own email preferences"
  ON user_email_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own email preferences" ON user_email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON user_email_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own email preferences" ON user_email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON user_email_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 建立 message_digest_queue 表
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

DROP INDEX IF EXISTS idx_message_digest_queue_unique;
CREATE UNIQUE INDEX idx_message_digest_queue_unique ON message_digest_queue(user_id, conversation_id);

-- 4. 確保 profiles 有 email 欄位
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

-- 5. RPC 函數
CREATE OR REPLACE FUNCTION get_email_preferences()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prefs RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_prefs FROM user_email_preferences WHERE user_id = v_user_id;

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

  INSERT INTO user_email_preferences (user_id, offer_notifications, accept_reject_notifications, message_digest)
  VALUES (v_user_id, COALESCE(p_offer_notifications, true), COALESCE(p_accept_reject_notifications, true), COALESCE(p_message_digest, true))
  ON CONFLICT (user_id) DO UPDATE SET
    offer_notifications = COALESCE(p_offer_notifications, user_email_preferences.offer_notifications),
    accept_reject_notifications = COALESCE(p_accept_reject_notifications, user_email_preferences.accept_reject_notifications),
    message_digest = COALESCE(p_message_digest, user_email_preferences.message_digest),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_email_preferences(BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION check_email_preference(p_user_id UUID, p_category TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  SELECT * INTO v_prefs FROM user_email_preferences WHERE user_id = p_user_id;
  IF v_prefs.id IS NULL THEN RETURN true; END IF;

  CASE p_category
    WHEN 'offer_created' THEN RETURN v_prefs.offer_notifications;
    WHEN 'offer_accepted', 'offer_rejected' THEN RETURN v_prefs.accept_reject_notifications;
    WHEN 'message_digest' THEN RETURN v_prefs.message_digest;
    ELSE RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Email 系統已完成！' AS status;













