-- ============================================
-- Email Outbox System Migration
-- 建立 production-safe 的私信 email 通知系統
-- ============================================

-- ============================================
-- 1. 建立/補齊 public.email_outbox 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'message_notification',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  dedupe_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加缺失的欄位（如果表已存在）
DO $$
BEGIN
  -- kind
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'kind') THEN
    ALTER TABLE public.email_outbox ADD COLUMN kind TEXT NOT NULL DEFAULT 'message_notification';
  END IF;
  
  -- payload
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'payload') THEN
    ALTER TABLE public.email_outbox ADD COLUMN payload JSONB NOT NULL DEFAULT '{}';
  END IF;
  
  -- attempts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'attempts') THEN
    ALTER TABLE public.email_outbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- next_attempt_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'next_attempt_at') THEN
    ALTER TABLE public.email_outbox ADD COLUMN next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  -- last_error
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'last_error') THEN
    ALTER TABLE public.email_outbox ADD COLUMN last_error TEXT;
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outbox' AND column_name = 'updated_at') THEN
    ALTER TABLE public.email_outbox ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 去重索引：同一收件者+同一 conversation，10 分鐘內只 enqueue 一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_dedupe 
ON public.email_outbox (dedupe_key)
WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'processing', 'sent');

-- 查詢索引：用於 worker 批次處理
CREATE INDEX IF NOT EXISTS idx_email_outbox_pending 
ON public.email_outbox (next_attempt_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_outbox_user 
ON public.email_outbox (user_id, created_at DESC);

-- ============================================
-- 2. 建立 public.notification_preferences 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_msg_new_thread_email BOOLEAN NOT NULL DEFAULT true,
  notify_msg_reply_email BOOLEAN NOT NULL DEFAULT true,
  notify_offer_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 為現有用戶建立預設通知偏好
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. Helper Function：取得用戶 email
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Helper Function：取得用戶名稱
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT COALESCE(name, display_name, 'User') INTO v_name 
  FROM public.profiles WHERE id = p_user_id;
  RETURN COALESCE(v_name, 'User');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 核心 Function：enqueue_message_email()
-- ============================================

CREATE OR REPLACE FUNCTION public.enqueue_message_email()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_receiver_id UUID;
  v_receiver_email TEXT;
  v_sender_name TEXT;
  v_dedupe_key TEXT;
  v_notify_enabled BOOLEAN;
  v_content_preview TEXT;
  v_dedupe_window TIMESTAMPTZ;
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
  
  -- 5. 建立去重 key：receiver_id + conversation_id（10 分鐘窗口）
  v_dedupe_window := NOW() - INTERVAL '10 minutes';
  v_dedupe_key := v_receiver_id::text || ':' || NEW.conversation_id::text || ':' || 
                  date_trunc('minute', NOW() - (EXTRACT(MINUTE FROM NOW())::integer % 10) * INTERVAL '1 minute')::text;
  
  -- 6. 取得發送者名稱
  v_sender_name := public.get_user_name(NEW.sender_id);
  
  -- 7. 建立內容預覽（前 120 字）
  v_content_preview := LEFT(NEW.content, 120);
  IF LENGTH(NEW.content) > 120 THEN
    v_content_preview := v_content_preview || '...';
  END IF;
  
  -- 8. 插入 email_outbox（使用 ON CONFLICT 去重）
  INSERT INTO public.email_outbox (
    kind,
    user_id,
    to_email,
    payload,
    dedupe_key,
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
      'created_at', NEW.created_at
    ),
    v_dedupe_key,
    'pending',
    0,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'processing', 'sent')
  DO UPDATE SET
    -- 更新 payload 以包含最新訊息
    payload = email_outbox.payload || jsonb_build_object(
      'latest_message_id', NEW.id,
      'latest_content_preview', v_content_preview,
      'message_count', COALESCE((email_outbox.payload->>'message_count')::integer, 1) + 1
    ),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 記錄錯誤但不中斷訊息插入
    RAISE WARNING 'enqueue_message_email failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 建立 Trigger：after insert on messages
-- ============================================

DROP TRIGGER IF EXISTS trigger_enqueue_message_email ON public.messages;

CREATE TRIGGER trigger_enqueue_message_email
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_message_email();

-- ============================================
-- 7. 自動建立新用戶的通知偏好（Trigger）
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;

CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_notification_prefs();

-- ============================================
-- 8. RLS Policies
-- ============================================

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- email_outbox：僅 service role 可存取（worker 使用）
DROP POLICY IF EXISTS "Service role full access on email_outbox" ON public.email_outbox;
CREATE POLICY "Service role full access on email_outbox"
  ON public.email_outbox
  FOR ALL
  USING (auth.role() = 'service_role');

-- notification_preferences：用戶可讀寫自己的設定
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. Grant permissions
-- ============================================

GRANT ALL ON public.email_outbox TO service_role;
GRANT SELECT, UPDATE, INSERT ON public.notification_preferences TO authenticated;

-- ============================================
-- 完成訊息
-- ============================================

SELECT 'Migration completed: Email Outbox System created' AS status;



