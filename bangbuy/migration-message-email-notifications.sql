-- ============================================
-- 🔔 私訊 Email 通知系統 - Database Migration
-- 在 Supabase SQL Editor 執行
-- ============================================

-- ============================================
-- A1. 擴充 profiles 表：新增通知設定欄位
-- ============================================

-- 新對話的第一則私訊 Email 通知（預設開）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notify_msg_new_thread_email BOOLEAN DEFAULT TRUE;

-- 未讀提醒 Email 通知（預設開）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notify_msg_unread_reminder_email BOOLEAN DEFAULT TRUE;

-- 每一則私訊都寄 Email（預設關，避免惱人）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notify_msg_every_message_email BOOLEAN DEFAULT FALSE;

-- 未讀多久後才寄提醒（小時，預設 12）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notify_msg_unread_hours INTEGER DEFAULT 12;

-- 用戶最後活躍時間（用於判斷是否在線，避免在線時寄信）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN profiles.notify_msg_new_thread_email IS '新對話第一則訊息寄 Email';
COMMENT ON COLUMN profiles.notify_msg_unread_reminder_email IS '未讀超過 X 小時寄提醒 Email';
COMMENT ON COLUMN profiles.notify_msg_every_message_email IS '每一則私訊都寄 Email';
COMMENT ON COLUMN profiles.notify_msg_unread_hours IS '未讀多久後寄提醒（小時）';
COMMENT ON COLUMN profiles.last_seen_at IS '最後活躍時間';

-- ============================================
-- A2. 擴充 messages 表：新增訊息類型欄位
-- ============================================

-- 訊息類型（用於決定通知策略）
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'REPLY_MESSAGE' 
CHECK (message_type IN ('FIRST_MESSAGE', 'REPLY_MESSAGE', 'SYSTEM_MESSAGE'));

-- 是否已發送 Email 通知（避免重複發送）
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS email_notified BOOLEAN DEFAULT FALSE;

-- Email 通知發送時間
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS email_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN messages.message_type IS '訊息類型: FIRST_MESSAGE/REPLY_MESSAGE/SYSTEM_MESSAGE';
COMMENT ON COLUMN messages.email_notified IS '是否已發送 Email 通知';
COMMENT ON COLUMN messages.email_notified_at IS 'Email 通知發送時間';

-- ============================================
-- A3. 新增 conversation_reminders 表（未讀提醒追蹤）
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 提醒追蹤
  last_reminded_at TIMESTAMPTZ,
  last_message_id_reminded UUID REFERENCES messages(id) ON DELETE SET NULL,
  reminder_count INTEGER DEFAULT 0,
  
  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每個用戶每個對話只有一條記錄
  UNIQUE(conversation_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_user ON conversation_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_conversation ON conversation_reminders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_last_reminded ON conversation_reminders(last_reminded_at);

-- RLS
ALTER TABLE conversation_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reminders" ON conversation_reminders;
CREATE POLICY "Users can view own reminders"
  ON conversation_reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reminders" ON conversation_reminders;
CREATE POLICY "Users can insert own reminders"
  ON conversation_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reminders" ON conversation_reminders;
CREATE POLICY "Users can update own reminders"
  ON conversation_reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- Service Role 可以完整操作（用於 cron job）
DROP POLICY IF EXISTS "Service role can manage all reminders" ON conversation_reminders;
CREATE POLICY "Service role can manage all reminders"
  ON conversation_reminders FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE conversation_reminders IS '對話未讀提醒追蹤（避免重複發送提醒）';

-- ============================================
-- A4. 新增索引以支援查詢效能
-- ============================================

-- messages 索引：查詢未通知的訊息
CREATE INDEX IF NOT EXISTS idx_messages_email_notified ON messages(email_notified) WHERE email_notified = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- profiles 索引：查詢通知設定
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen_at);

-- ============================================
-- B. 訊息分類函數：判斷 message_type
-- ============================================

CREATE OR REPLACE FUNCTION determine_message_type(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_message_count INTEGER;
BEGIN
  -- 計算該對話中，receiver 已收到的訊息數量
  SELECT COUNT(*) INTO v_message_count
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_receiver_id;  -- 排除 receiver 自己發的訊息
  
  -- 如果是 receiver 收到的第一則訊息
  IF v_message_count = 0 THEN
    RETURN 'FIRST_MESSAGE';
  ELSE
    RETURN 'REPLY_MESSAGE';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- C. 取得對話的另一方用戶
-- ============================================

CREATE OR REPLACE FUNCTION get_conversation_receiver(
  p_conversation_id UUID,
  p_sender_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_receiver_id UUID;
BEGIN
  SELECT 
    CASE 
      WHEN user1_id = p_sender_id THEN user2_id
      ELSE user1_id
    END INTO v_receiver_id
  FROM conversations
  WHERE id = p_conversation_id;
  
  RETURN v_receiver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- D. 觸發器：新訊息時自動設定 message_type
-- ============================================

CREATE OR REPLACE FUNCTION set_message_type_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_id UUID;
BEGIN
  -- 如果已經設定了 message_type（例如 SYSTEM_MESSAGE），不覆蓋
  IF NEW.message_type IS NOT NULL AND NEW.message_type != 'REPLY_MESSAGE' THEN
    RETURN NEW;
  END IF;
  
  -- 取得接收者
  v_receiver_id := get_conversation_receiver(NEW.conversation_id, NEW.sender_id);
  
  -- 判斷訊息類型
  NEW.message_type := determine_message_type(NEW.conversation_id, NEW.sender_id, v_receiver_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_message_type ON messages;
CREATE TRIGGER trigger_set_message_type
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_type_on_insert();

-- ============================================
-- E. 更新 last_seen_at 函數
-- ============================================

CREATE OR REPLACE FUNCTION update_user_last_seen(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET last_seen_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- F. 查詢待發送未讀提醒的函數（給 cron job 使用）
-- ============================================

CREATE OR REPLACE FUNCTION get_pending_unread_reminders()
RETURNS TABLE (
  conversation_id UUID,
  receiver_id UUID,
  receiver_email TEXT,
  receiver_name TEXT,
  sender_name TEXT,
  message_snippet TEXT,
  message_created_at TIMESTAMPTZ,
  unread_hours INTEGER,
  message_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (m.conversation_id, receiver.id)
    m.conversation_id,
    receiver.id AS receiver_id,
    receiver.email AS receiver_email,
    COALESCE(receiver.display_name, receiver.name) AS receiver_name,
    COALESCE(sender.display_name, sender.name) AS sender_name,
    LEFT(m.content, 80) AS message_snippet,
    m.created_at AS message_created_at,
    COALESCE(receiver.notify_msg_unread_hours, 12) AS unread_hours,
    m.id AS message_id
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  JOIN profiles sender ON sender.id = m.sender_id
  JOIN profiles receiver ON receiver.id = CASE 
    WHEN c.user1_id = m.sender_id THEN c.user2_id 
    ELSE c.user1_id 
  END
  LEFT JOIN conversation_reminders cr ON cr.conversation_id = m.conversation_id AND cr.user_id = receiver.id
  WHERE
    -- 訊息未通知過
    m.email_notified = FALSE
    -- 只處理 REPLY_MESSAGE（FIRST_MESSAGE 和 SYSTEM_MESSAGE 即時發送）
    AND m.message_type = 'REPLY_MESSAGE'
    -- 訊息創建時間超過用戶設定的未讀小時數
    AND m.created_at <= NOW() - (COALESCE(receiver.notify_msg_unread_hours, 12) || ' hours')::INTERVAL
    -- 用戶開啟了未讀提醒
    AND receiver.notify_msg_unread_reminder_email = TRUE
    -- 用戶沒有開啟「每則都寄」（避免重複）
    AND receiver.notify_msg_every_message_email = FALSE
    -- 接收者尚未讀取（使用 conversation 的 last_read_at）
    AND (
      (c.user1_id = receiver.id AND (c.user1_last_read_at IS NULL OR c.user1_last_read_at < m.created_at))
      OR
      (c.user2_id = receiver.id AND (c.user2_last_read_at IS NULL OR c.user2_last_read_at < m.created_at))
    )
    -- 24 小時內同一對話只提醒一次
    AND (cr.last_reminded_at IS NULL OR cr.last_reminded_at < NOW() - INTERVAL '24 hours')
    -- 用戶不在線（5 分鐘內沒活動）
    AND (receiver.last_seen_at IS NULL OR receiver.last_seen_at < NOW() - INTERVAL '5 minutes')
  ORDER BY m.conversation_id, receiver.id, m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- G. Feature Flag 開關
-- ============================================

INSERT INTO feature_flags (key, enabled_for, rollout_percentage, updated_at)
VALUES ('message_email_notifications', 'member', 100, NOW())
ON CONFLICT (key) DO UPDATE SET
  enabled_for = EXCLUDED.enabled_for,
  rollout_percentage = EXCLUDED.rollout_percentage,
  updated_at = NOW();

-- ============================================
-- 完成
-- ============================================

SELECT '✅ 私訊 Email 通知系統 Migration 完成！' AS status;

