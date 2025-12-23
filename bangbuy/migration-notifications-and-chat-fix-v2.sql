-- ============================================
-- 🔔 BangBuy 通知系統 + 聊天室去重修復 (V2)
-- 修復版：先處理重複資料再建索引
-- 請在 Supabase SQL Editor 中執行
-- ============================================

-- ============================================
-- A1. 建立通知相關資料表
-- ============================================

-- 1. notifications 主表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  deep_link TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, read_at);

-- 唯一約束：防止重複通知
DROP INDEX IF EXISTS idx_notifications_dedupe;
CREATE UNIQUE INDEX idx_notifications_dedupe 
  ON notifications(user_id, dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- 2. notification_preferences 偏好設定表
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  inapp_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  type_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. notification_outbox
CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status 
  ON notification_outbox(status, next_retry_at);

DROP TRIGGER IF EXISTS update_notification_outbox_updated_at ON notification_outbox;
CREATE TRIGGER update_notification_outbox_updated_at
  BEFORE UPDATE ON notification_outbox
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- A2. RLS 政策
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- notifications RLS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Deny direct insert for users" ON notifications;
CREATE POLICY "Deny direct insert for users"
  ON notifications FOR INSERT
  WITH CHECK (false);

-- notification_preferences RLS
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;
CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- notification_outbox RLS
DROP POLICY IF EXISTS "Deny all for outbox" ON notification_outbox;
CREATE POLICY "Deny all for outbox"
  ON notification_outbox FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- A3. Helper Function
-- ============================================

CREATE OR REPLACE FUNCTION is_notification_enabled(
  p_user UUID,
  p_type TEXT,
  p_channel TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  pref RECORD;
  type_setting JSONB;
BEGIN
  SELECT * INTO pref 
  FROM notification_preferences 
  WHERE user_id = p_user;
  
  IF NOT FOUND THEN
    CASE p_channel
      WHEN 'inapp' THEN RETURN TRUE;
      WHEN 'email' THEN RETURN FALSE;
      WHEN 'push' THEN RETURN FALSE;
      ELSE RETURN FALSE;
    END CASE;
  END IF;
  
  type_setting := pref.type_settings->p_type;
  
  IF type_setting IS NOT NULL AND type_setting->p_channel IS NOT NULL THEN
    RETURN (type_setting->>p_channel)::BOOLEAN;
  END IF;
  
  CASE p_channel
    WHEN 'inapp' THEN RETURN pref.inapp_enabled;
    WHEN 'email' THEN RETURN pref.email_enabled;
    WHEN 'push' THEN RETURN pref.push_enabled;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- A4. Trigger：新訊息 → 通知對方
-- ============================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
  receiver_id UUID;
  sender_name TEXT;
  is_blocked_flag BOOLEAN;
  notification_enabled BOOLEAN;
BEGIN
  SELECT * INTO conv 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  IF conv.user1_id = NEW.sender_id THEN
    receiver_id := conv.user2_id;
  ELSE
    receiver_id := conv.user1_id;
  END IF;
  
  IF receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = receiver_id)
       OR (blocker_id = receiver_id AND blocked_id = NEW.sender_id)
  ) INTO is_blocked_flag;
  
  IF is_blocked_flag THEN
    RETURN NEW;
  END IF;
  
  SELECT is_notification_enabled(receiver_id, 'message.new', 'inapp') 
  INTO notification_enabled;
  
  IF NOT notification_enabled THEN
    RETURN NEW;
  END IF;
  
  SELECT name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  INSERT INTO notifications (
    user_id, actor_id, type, title, body, deep_link, data, dedupe_key
  ) VALUES (
    receiver_id,
    NEW.sender_id,
    'message.new',
    '你收到一則新訊息',
    LEFT(NEW.content, 120),
    '/chat?conversation=' || NEW.conversation_id::TEXT,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    ),
    'message.new:' || NEW.id::TEXT
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  DO NOTHING;
  
  BEGIN
    IF is_notification_enabled(receiver_id, 'message.new', 'email') THEN
      INSERT INTO notification_outbox (notification_id, channel)
      SELECT id, 'email' FROM notifications 
      WHERE dedupe_key = 'message.new:' || NEW.id::TEXT 
      AND user_id = receiver_id
      LIMIT 1;
    END IF;
    
    IF is_notification_enabled(receiver_id, 'message.new', 'push') THEN
      INSERT INTO notification_outbox (notification_id, channel)
      SELECT id, 'push' FROM notifications 
      WHERE dedupe_key = 'message.new:' || NEW.id::TEXT 
      AND user_id = receiver_id
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ============================================
-- A5. RPC Functions
-- ============================================

CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 30,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF notifications AS $$
BEGIN
  IF p_before IS NULL THEN
    RETURN QUERY
    SELECT * FROM notifications
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT * FROM notifications
    WHERE user_id = auth.uid()
      AND created_at < p_before
    ORDER BY created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_notification_unread_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM notifications 
    WHERE user_id = auth.uid() 
      AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_read(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = p_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_notifications(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION is_notification_enabled(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- C1. Conversations 唯一鍵修復
-- ============================================

-- Step 1: 新增欄位
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS user_low_id UUID;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS user_high_id UUID;

-- Step 2: 反填現有資料
UPDATE conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id)
WHERE user_low_id IS NULL OR user_high_id IS NULL;

-- Step 3: 刪除舊的唯一索引
DROP INDEX IF EXISTS idx_conversations_unique_pair;
DROP INDEX IF EXISTS idx_conversations_stable_unique;

-- ============================================
-- C1. 🔥 關鍵：先刪除重複資料再建索引
-- ============================================

-- Step 4: 識別並刪除重複的 conversations（保留最新的）
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LEAST(user1_id, user2_id),
        GREATEST(user1_id, user2_id),
        COALESCE(source_type, 'direct'),
        COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY 
        last_message_at DESC NULLS LAST,
        created_at DESC
    ) as rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY 
        LEAST(user1_id, user2_id),
        GREATEST(user1_id, user2_id),
        COALESCE(source_type, 'direct'),
        COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY 
        last_message_at DESC NULLS LAST,
        created_at DESC
    ) as keep_id
  FROM conversations
)
-- 先把被刪除的 conversation 的 messages 搬到保留的 conversation
UPDATE messages m
SET conversation_id = d.keep_id
FROM duplicates d
WHERE m.conversation_id = d.id
  AND d.rn > 1
  AND d.id != d.keep_id;

-- 刪除重複的 conversations
DELETE FROM conversations
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          LEAST(user1_id, user2_id),
          GREATEST(user1_id, user2_id),
          COALESCE(source_type, 'direct'),
          COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
        ORDER BY 
          last_message_at DESC NULLS LAST,
          created_at DESC
      ) as rn
    FROM conversations
  ) ranked
  WHERE rn > 1
);

-- Step 5: 確保欄位非 NULL
UPDATE conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id)
WHERE user_low_id IS NULL OR user_high_id IS NULL;

-- Step 6: 現在可以安全地建立唯一索引
CREATE UNIQUE INDEX idx_conversations_stable_unique
ON conversations (
  user_low_id, 
  user_high_id, 
  COALESCE(source_type, 'direct'),
  COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================
-- C2. RPC: get_or_create_conversation
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_target UUID,
  p_source_type TEXT DEFAULT 'direct',
  p_source_id UUID DEFAULT NULL,
  p_source_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  is_new BOOLEAN
) AS $$
DECLARE
  v_my_id UUID := auth.uid();
  v_low_id UUID;
  v_high_id UUID;
  v_conv_id UUID;
  v_source_type TEXT;
  v_source_key TEXT;
  v_is_new BOOLEAN := FALSE;
BEGIN
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_target IS NULL OR p_target = v_my_id THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  
  v_low_id := LEAST(v_my_id, p_target);
  v_high_id := GREATEST(v_my_id, p_target);
  v_source_type := COALESCE(NULLIF(p_source_type, ''), 'direct');
  v_source_key := COALESCE(p_source_id::TEXT, 'direct');
  
  -- 查找現有對話
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE user_low_id = v_low_id
    AND user_high_id = v_high_id
    AND COALESCE(source_type, 'direct') = v_source_type
    AND COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  IF v_conv_id IS NOT NULL THEN
    RETURN QUERY SELECT v_conv_id, FALSE;
    RETURN;
  END IF;
  
  -- 建立新對話
  INSERT INTO conversations (
    user1_id, user2_id, user_low_id, user_high_id,
    source_type, source_id, source_title, source_key, last_message_at
  ) VALUES (
    v_my_id, p_target, v_low_id, v_high_id,
    v_source_type, p_source_id, p_source_title, v_source_key, NOW()
  )
  RETURNING id INTO v_conv_id;
  
  RETURN QUERY SELECT v_conv_id, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ============================================
-- 完成確認
-- ============================================

SELECT '✅ notifications system ready' AS status;
SELECT '✅ conversations dedupe completed' AS status;
SELECT '✅ get_or_create_conversation RPC ready' AS status;











