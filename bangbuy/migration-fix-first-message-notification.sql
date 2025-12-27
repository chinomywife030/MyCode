-- ============================================
-- 🔧 修復第一則私訊通知消失問題
-- ============================================

-- 1. 在 conversations 表添加 first_message_notified_at 欄位
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS first_message_notified_at TIMESTAMPTZ;

-- 2. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_conversations_first_message_notified 
ON conversations(first_message_notified_at) 
WHERE first_message_notified_at IS NOT NULL;

-- 3. 更新 notify_on_new_message trigger function
-- 添加對第一則消息的特殊處理
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
  receiver_id UUID;
  sender_name TEXT;
  is_blocked_flag BOOLEAN;
  notification_enabled BOOLEAN;
  receiver_exists BOOLEAN;
  is_first_message BOOLEAN;
  notification_type TEXT;
  notification_title TEXT;
  notification_dedupe_key TEXT;
BEGIN
  -- 獲取對話資訊
  SELECT * INTO conv 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- 確定接收者（對方）
  IF conv.user1_id = NEW.sender_id THEN
    receiver_id := conv.user2_id;
  ELSE
    receiver_id := conv.user1_id;
  END IF;
  
  -- 不通知自己
  IF receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  
  -- 🔧 關鍵修復：檢查接收者是否存在於 profiles 表
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = receiver_id
  ) INTO receiver_exists;
  
  IF NOT receiver_exists THEN
    -- 接收者沒有 profile，跳過通知（但訊息仍然發送成功）
    RETURN NEW;
  END IF;
  
  -- 檢查封鎖狀態（任一方向）
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = NEW.sender_id AND blocked_id = receiver_id)
       OR (blocker_id = receiver_id AND blocked_id = NEW.sender_id)
  ) INTO is_blocked_flag;
  
  IF is_blocked_flag THEN
    RETURN NEW;
  END IF;
  
  -- 🆕 判斷是否為第一則消息（對接收者而言）
  -- 在 AFTER INSERT trigger 中，當前消息已經被插入
  -- 所以我們需要檢查是否有其他消息（排除當前消息）
  SELECT COUNT(*) <= 1 INTO is_first_message
  FROM messages
  WHERE conversation_id = NEW.conversation_id
    AND sender_id != receiver_id;
  
  -- 🔧 如果只有一則消息（就是當前這則），則為第一則消息
  -- 如果有多於一則，則不是第一則
  IF is_first_message THEN
    -- 確認只有一則消息（就是當前這則）
    SELECT COUNT(*) = 1 INTO is_first_message
    FROM messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id != receiver_id;
  ELSE
    is_first_message := FALSE;
  END IF;
  
  -- 🆕 如果是第一則消息，檢查是否已經通知過
  IF is_first_message THEN
    -- 檢查是否已經通知過（使用 first_message_notified_at）
    IF conv.first_message_notified_at IS NOT NULL THEN
      -- 已經通知過，不再創建第一則消息通知
      is_first_message := FALSE;
    ELSE
      -- 標記為已通知（在通知成功創建後更新）
      -- 這裡先標記，避免重複觸發
      UPDATE conversations
      SET first_message_notified_at = NOW()
      WHERE id = NEW.conversation_id
        AND first_message_notified_at IS NULL;
    END IF;
  END IF;
  
  -- 檢查通知偏好
  SELECT is_notification_enabled(receiver_id, 'message.new', 'inapp') 
  INTO notification_enabled;
  
  IF NOT notification_enabled THEN
    RETURN NEW;
  END IF;
  
  -- 獲取發送者名稱
  SELECT name INTO sender_name 
  FROM profiles 
  WHERE id = NEW.sender_id;
  
  -- 🆕 根據是否為第一則消息設置不同的通知類型和標題
  IF is_first_message THEN
    notification_type := 'message.first';
    notification_title := COALESCE(sender_name || ' 發送了第一則訊息', '你收到第一則新訊息');
    notification_dedupe_key := 'message.first:' || NEW.conversation_id::TEXT;
  ELSE
    notification_type := 'message.new';
    notification_title := '你收到一則新訊息';
    notification_dedupe_key := 'message.new:' || NEW.id::TEXT;
  END IF;
  
  -- 建立通知（使用 ON CONFLICT 防止重複）
  BEGIN
    INSERT INTO notifications (
      user_id, actor_id, type, title, body, deep_link, data, dedupe_key
    ) VALUES (
      receiver_id,
      NEW.sender_id,
      notification_type,
      notification_title,
      LEFT(NEW.content, 120),
      '/chat?conversation=' || NEW.conversation_id::TEXT,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'is_first_message', is_first_message
      ),
      notification_dedupe_key
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
    DO NOTHING;
    
    -- 🆕 如果成功創建第一則消息通知，確保 first_message_notified_at 已設置
    IF is_first_message THEN
      UPDATE conversations
      SET first_message_notified_at = NOW()
      WHERE id = NEW.conversation_id
        AND first_message_notified_at IS NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- 如果通知建立失敗，不要影響訊息發送
    RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;
  
  -- outbox 處理（失敗不影響主流程）
  BEGIN
    IF is_notification_enabled(receiver_id, 'message.new', 'email') THEN
      INSERT INTO notification_outbox (notification_id, channel)
      SELECT id, 'email' FROM notifications 
      WHERE dedupe_key = notification_dedupe_key
        AND user_id = receiver_id
      LIMIT 1;
    END IF;
    
    IF is_notification_enabled(receiver_id, 'message.new', 'push') THEN
      INSERT INTO notification_outbox (notification_id, channel)
      SELECT id, 'push' FROM notifications 
      WHERE dedupe_key = notification_dedupe_key
        AND user_id = receiver_id
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 確保 trigger 存在
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

SELECT '✅ First message notification fix applied' AS status;
