-- ============================================
-- 🔧 修復通知 Trigger - 處理 profiles 不存在的情況
-- ============================================

-- 更新 notify_on_new_message trigger function
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
  receiver_id UUID;
  sender_name TEXT;
  is_blocked_flag BOOLEAN;
  notification_enabled BOOLEAN;
  receiver_exists BOOLEAN;
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
  
  -- 建立通知（使用 ON CONFLICT 防止重複）
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- 如果通知建立失敗，不要影響訊息發送
    RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;
  
  -- outbox 處理（失敗不影響主流程）
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

-- 確保 trigger 存在
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- ============================================
-- 🔧 順便修復：確保所有 auth 用戶都有 profiles
-- ============================================

-- 為缺少 profile 的用戶建立 profile（只使用必要欄位）
INSERT INTO profiles (id, name, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.email, 'User'),
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Notification trigger fixed' AS status;
SELECT '✅ Missing profiles created' AS status;

