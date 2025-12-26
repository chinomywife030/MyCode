-- ============================================
-- 移除私訊 Email 節流邏輯
-- 修正：每則私訊都應該產生一封 Email
-- ============================================

-- ============================================
-- 1. 重建 trigger function（無節流版本）
-- ============================================

CREATE OR REPLACE FUNCTION public.enqueue_message_email_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_receiver_id UUID;
  v_receiver_email TEXT;
  v_sender_name TEXT;
  v_notify_enabled BOOLEAN;
  v_content_preview TEXT;
BEGIN
  -- 1. 取得對話資訊
  SELECT user1_id, user2_id INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  IF v_conversation IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 2. 判斷接收者（非發送者的那一方）
  IF v_conversation.user1_id = NEW.sender_id THEN
    v_receiver_id := v_conversation.user2_id;
  ELSE
    v_receiver_id := v_conversation.user1_id;
  END IF;
  
  -- 3. 取得接收者 email
  v_receiver_email := public.get_user_email(v_receiver_id);
  
  IF v_receiver_email IS NULL OR v_receiver_email = '' THEN
    RETURN NEW;
  END IF;
  
  -- 4. 檢查接收者的通知偏好
  -- 注意：這裡檢查 notify_msg_new_thread_email 欄位
  -- 若用戶關閉通知，則不發送
  SELECT COALESCE(notify_msg_new_thread_email, true) INTO v_notify_enabled
  FROM public.notification_preferences
  WHERE user_id = v_receiver_id;
  
  -- 若沒有設定，預設啟用
  IF v_notify_enabled IS NULL THEN
    v_notify_enabled := true;
  END IF;
  
  IF NOT v_notify_enabled THEN
    RETURN NEW;
  END IF;
  
  -- 5. 取得發送者名稱
  v_sender_name := public.get_user_name(NEW.sender_id);
  
  -- 6. 建立內容預覽（前 120 字）
  v_content_preview := LEFT(NEW.content, 120);
  IF LENGTH(NEW.content) > 120 THEN
    v_content_preview := v_content_preview || '...';
  END IF;
  
  -- 7. 直接插入 email_outbox（無節流、無去重）
  --    每則訊息 = 一封 Email
  INSERT INTO public.email_outbox (
    kind,
    user_id,
    to_email,
    payload,
    dedupe_key,  -- 設為 NULL，不啟用去重
    status,
    attempts,
    next_attempt_at,
    created_at,
    updated_at
  ) VALUES (
    'message_notification',
    v_receiver_id,
    v_receiver_email,
    jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'content_preview', v_content_preview,
      'message_type', COALESCE(NEW.message_type, 'REPLY_MESSAGE'),
      'created_at', NEW.created_at,
      'message_count', 1  -- 永遠是 1，因為不合併
    ),
    NULL,  -- dedupe_key = NULL，不啟用去重
    'pending',
    0,
    NOW(),  -- 立即可發送（無延遲）
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 記錄錯誤但不中斷訊息插入
    RAISE WARNING 'enqueue_message_email_v2 failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 確保 trigger 已綁定
-- ============================================

DROP TRIGGER IF EXISTS trigger_enqueue_message_email ON public.messages;

CREATE TRIGGER trigger_enqueue_message_email
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_message_email_v2();

-- ============================================
-- 完成訊息
-- ============================================

SELECT 'Migration completed: Removed message email throttling - each message now creates one email' AS status;

