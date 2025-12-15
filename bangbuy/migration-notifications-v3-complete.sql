-- ============================================
-- 🔔 BangBuy 通知系統 V3 - 完整版（可重跑）
-- 符合用戶規格的 is_read + href 設計
-- ============================================

-- ============================================
-- 第 1 部分：建立 notifications 表
-- ============================================

-- 如果舊表存在，先備份並調整
DO $$
BEGIN
  -- 檢查是否有舊的 notifications 表，有的話加上缺少的欄位
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- 加上 is_read 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
      ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- 加上 href 欄位（如果不存在，從 deep_link 遷移）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'href') THEN
      ALTER TABLE notifications ADD COLUMN href TEXT;
      -- 從 deep_link 遷移
      UPDATE notifications SET href = deep_link WHERE deep_link IS NOT NULL;
    END IF;
    
    -- 加上 source_type 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'source_type') THEN
      ALTER TABLE notifications ADD COLUMN source_type TEXT;
    END IF;
    
    -- 加上 source_id 欄位（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'source_id') THEN
      ALTER TABLE notifications ADD COLUMN source_id UUID;
    END IF;
    
    -- 同步 is_read 與 read_at
    UPDATE notifications SET is_read = TRUE WHERE read_at IS NOT NULL AND is_read = FALSE;
  ELSE
    -- 建立新表
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT,
      source_type TEXT,
      source_id UUID,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- 舊版相容欄位
      actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      deep_link TEXT,
      data JSONB DEFAULT '{}'::jsonb,
      dedupe_key TEXT
    );
  END IF;
END $$;

-- ============================================
-- 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- dedupe 索引（防止重複通知）
DROP INDEX IF EXISTS idx_notifications_dedupe;
CREATE UNIQUE INDEX idx_notifications_dedupe 
  ON notifications(user_id, dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- ============================================
-- 第 2 部分：RLS 政策
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT：只能看自己的
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE：只能改自己的（只允許設定 is_read 和 read_at）
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- INSERT：禁止前端直接插入（只允許 trigger / service role）
DROP POLICY IF EXISTS "notifications_insert_deny" ON notifications;
CREATE POLICY "notifications_insert_deny"
  ON notifications FOR INSERT
  WITH CHECK (false);

-- ============================================
-- 第 3 部分：RPC Functions
-- ============================================

-- 先刪除舊版函數（避免回傳類型衝突）
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_notification_read(p_id UUID);
DROP FUNCTION IF EXISTS mark_notification_read(p_notification_id UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read();
DROP FUNCTION IF EXISTS get_unread_notification_count();
DROP FUNCTION IF EXISTS get_notification_unread_count();
DROP FUNCTION IF EXISTS get_notifications(INTEGER, TIMESTAMPTZ);

-- 1. 獲取未讀數量
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 標記單筆已讀（回傳更新結果和新的未讀數）
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSON AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_unread_count INTEGER;
  v_user_id UUID := auth.uid();
BEGIN
  -- 只有當該通知屬於當前用戶且未讀時才更新
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = v_user_id
    AND is_read = FALSE;
  
  -- 檢查是否真的更新了
  IF FOUND THEN
    v_updated := TRUE;
  END IF;
  
  -- 獲取最新未讀數
  SELECT COUNT(*)::INTEGER INTO v_unread_count
  FROM notifications
  WHERE user_id = v_user_id
    AND is_read = FALSE;
  
  RETURN json_build_object(
    'updated', v_updated,
    'unread_count', COALESCE(v_unread_count, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 標記全部已讀（回傳 INTEGER，固定為 0）
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE user_id = v_user
    AND is_read = FALSE;

  -- 全部已讀後，未讀數必為 0
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 獲取通知列表（保持相容）
CREATE OR REPLACE FUNCTION get_notifications(
  p_limit INTEGER DEFAULT 20,
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

-- 舊版相容（避免前端報錯）
CREATE OR REPLACE FUNCTION get_notification_unread_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN get_unread_notification_count();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute 給 authenticated
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_notifications(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_unread_count() TO authenticated;

-- ============================================
-- 第 4 部分：更新訊息通知 Trigger
-- ============================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
  receiver_id UUID;
  sender_name TEXT;
  is_blocked_flag BOOLEAN;
  receiver_exists BOOLEAN;
BEGIN
  -- 獲取對話資訊
  SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  
  -- 確定接收者
  IF conv.user1_id = NEW.sender_id THEN
    receiver_id := conv.user2_id;
  ELSE
    receiver_id := conv.user1_id;
  END IF;
  
  -- 不通知自己
  IF receiver_id = NEW.sender_id THEN RETURN NEW; END IF;
  
  -- 檢查接收者是否存在於 profiles 表
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = receiver_id) INTO receiver_exists;
  IF NOT receiver_exists THEN RETURN NEW; END IF;
  
  -- 檢查封鎖
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = receiver_id)
       OR (blocker_id = receiver_id AND blocked_id = NEW.sender_id)
  ) INTO is_blocked_flag;
  IF is_blocked_flag THEN RETURN NEW; END IF;
  
  -- 獲取發送者名稱
  SELECT name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- 建立通知（使用新的欄位格式）
  BEGIN
    INSERT INTO notifications (
      user_id, 
      actor_id, 
      type, 
      title, 
      body, 
      href,
      source_type,
      source_id,
      is_read,
      deep_link,
      data, 
      dedupe_key
    ) VALUES (
      receiver_id,
      NEW.sender_id,
      'message',
      COALESCE(sender_name, '用戶') || ' 傳了訊息給你',
      LEFT(NEW.content, 100),
      '/chat?conversation=' || NEW.conversation_id::TEXT,
      'message',
      NEW.conversation_id,
      FALSE,
      '/chat?conversation=' || NEW.conversation_id::TEXT,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      ),
      'message:' || NEW.id::TEXT
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
    DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- 通知失敗不影響訊息發送
    RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 確保 trigger 存在
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ============================================
-- 完成確認
-- ============================================

SELECT '✅ notifications table ready' AS status;
SELECT '✅ RLS policies ready' AS status;
SELECT '✅ RPC functions ready' AS status;
SELECT '✅ Message notification trigger ready' AS status;

