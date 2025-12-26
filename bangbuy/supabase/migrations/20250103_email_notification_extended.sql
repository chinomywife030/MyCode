-- ============================================
-- Email Notification Extended Migration
-- 擴展 Email 通知系統：私訊節流 + 推薦 Digest
-- ============================================

-- ============================================
-- 1. 擴展 notification_preferences 表
-- ============================================

-- 添加推薦 Email 和 digest mode 欄位
DO $$
BEGIN
  -- email_reco_enabled：是否接收推薦 Email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'email_reco_enabled') THEN
    ALTER TABLE public.notification_preferences 
    ADD COLUMN email_reco_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  -- digest_mode：digest 頻率 (instant/hourly/daily)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'digest_mode') THEN
    ALTER TABLE public.notification_preferences 
    ADD COLUMN digest_mode TEXT NOT NULL DEFAULT 'daily' 
    CHECK (digest_mode IN ('instant', 'hourly', 'daily'));
  END IF;
END $$;

-- ============================================
-- 2. 建立 user_interests 表（用於推薦匹配）
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL CHECK (interest_type IN ('category', 'keyword', 'country')),
  interest_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, interest_type, interest_value)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_type_value ON public.user_interests(interest_type, interest_value);

-- ============================================
-- 3. 從收藏自動建立興趣（基於已收藏的 wishes）
-- ============================================

-- 當用戶收藏 wish 時，自動記錄其 category 為興趣
CREATE OR REPLACE FUNCTION public.auto_track_interest_from_favorite()
RETURNS TRIGGER AS $$
DECLARE
  v_category TEXT;
BEGIN
  -- 取得 wish 的 category
  SELECT category INTO v_category FROM public.wishes WHERE id = NEW.wish_id;
  
  IF v_category IS NOT NULL AND v_category != '' THEN
    INSERT INTO public.user_interests (user_id, interest_type, interest_value)
    VALUES (NEW.user_id, 'category', v_category)
    ON CONFLICT (user_id, interest_type, interest_value) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 trigger（如果 favorites 表存在）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
    DROP TRIGGER IF EXISTS trigger_auto_track_interest ON public.favorites;
    CREATE TRIGGER trigger_auto_track_interest
      AFTER INSERT ON public.favorites
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_track_interest_from_favorite();
  END IF;
END $$;

-- ============================================
-- 4. 建立 email_jobs 表（更通用的 job queue）
-- ============================================

-- 注意：這是新的 email_jobs 表，與原有的 email_outbox 並存
-- email_outbox 用於私訊通知，email_jobs 用於 recommendation digest
CREATE TABLE IF NOT EXISTS public.email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'recommendation')),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_email_jobs_pending ON public.email_jobs(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_jobs_user ON public.email_jobs(user_id, type, created_at DESC);

-- ============================================
-- 5. 建立推薦 Digest 產生函數
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_recommendation_digest()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user RECORD;
  v_wishes JSONB;
  v_scheduled_time TIMESTAMPTZ;
BEGIN
  -- 設定每日 09:00 UTC 發送（可調整）
  v_scheduled_time := date_trunc('day', NOW() + INTERVAL '1 day') + INTERVAL '9 hours';
  
  -- 對每個啟用推薦 Email 的用戶產生 digest
  FOR v_user IN 
    SELECT 
      np.user_id,
      u.email,
      COALESCE(p.display_name, p.name, 'User') as user_name
    FROM public.notification_preferences np
    JOIN auth.users u ON u.id = np.user_id
    LEFT JOIN public.profiles p ON p.id = np.user_id
    WHERE np.email_reco_enabled = true
      -- 避免重複：今天尚未產生 digest
      AND NOT EXISTS (
        SELECT 1 FROM public.email_jobs ej
        WHERE ej.user_id = np.user_id
          AND ej.type = 'recommendation'
          AND ej.created_at > NOW() - INTERVAL '20 hours'
      )
  LOOP
    -- 找出符合用戶興趣的新 wishes（過去 24 小時內）
    SELECT jsonb_agg(jsonb_build_object(
      'id', w.id,
      'title', w.title,
      'category', w.category,
      'country', w.country,
      'created_at', w.created_at
    )) INTO v_wishes
    FROM public.wishes w
    WHERE w.created_at > NOW() - INTERVAL '24 hours'
      AND w.user_id != v_user.user_id  -- 排除自己的 wish
      AND (
        -- 匹配用戶的興趣
        EXISTS (
          SELECT 1 FROM public.user_interests ui
          WHERE ui.user_id = v_user.user_id
            AND (
              (ui.interest_type = 'category' AND ui.interest_value = w.category)
              OR (ui.interest_type = 'country' AND ui.interest_value = w.country)
            )
        )
        -- 或者：如果用戶沒有設定興趣，顯示熱門 wishes
        OR NOT EXISTS (
          SELECT 1 FROM public.user_interests ui WHERE ui.user_id = v_user.user_id
        )
      )
    LIMIT 10;
    
    -- 如果有推薦內容，建立 job
    IF v_wishes IS NOT NULL AND jsonb_array_length(v_wishes) > 0 THEN
      INSERT INTO public.email_jobs (
        user_id,
        type,
        payload,
        status,
        scheduled_for,
        created_at
      ) VALUES (
        v_user.user_id,
        'recommendation',
        jsonb_build_object(
          'user_name', v_user.user_name,
          'to_email', v_user.email,
          'items', v_wishes,
          'item_count', jsonb_array_length(v_wishes)
        ),
        'pending',
        v_scheduled_time,
        NOW()
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 更新私訊通知 trigger（改進節流邏輯）
-- ============================================

CREATE OR REPLACE FUNCTION public.enqueue_message_email_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_receiver_id UUID;
  v_receiver_email TEXT;
  v_sender_name TEXT;
  v_dedupe_key TEXT;
  v_notify_enabled BOOLEAN;
  v_content_preview TEXT;
  v_scheduled_for TIMESTAMPTZ;
  v_existing_pending BOOLEAN;
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
  
  IF v_notify_enabled IS NULL THEN
    v_notify_enabled := true;
  END IF;
  
  IF NOT v_notify_enabled THEN
    RETURN NEW;
  END IF;
  
  -- 5. 節流檢查：同一對話 2 分鐘內是否已有 pending email
  SELECT EXISTS (
    SELECT 1 FROM public.email_outbox
    WHERE user_id = v_receiver_id
      AND status = 'pending'
      AND payload->>'conversation_id' = NEW.conversation_id::text
      AND created_at > NOW() - INTERVAL '2 minutes'
  ) INTO v_existing_pending;
  
  -- 如果 2 分鐘內已有 pending，更新該筆而非新增
  IF v_existing_pending THEN
    UPDATE public.email_outbox
    SET 
      payload = payload || jsonb_build_object(
        'latest_message_id', NEW.id,
        'latest_content_preview', LEFT(NEW.content, 120),
        'message_count', COALESCE((payload->>'message_count')::integer, 1) + 1
      ),
      updated_at = NOW()
    WHERE user_id = v_receiver_id
      AND status = 'pending'
      AND payload->>'conversation_id' = NEW.conversation_id::text
      AND created_at > NOW() - INTERVAL '2 minutes';
    
    RETURN NEW;
  END IF;
  
  -- 6. 設定 scheduled_for = now() + 2 分鐘（節流窗口）
  v_scheduled_for := NOW() + INTERVAL '2 minutes';
  
  -- 7. 取得發送者名稱
  v_sender_name := public.get_user_name(NEW.sender_id);
  
  -- 8. 建立內容預覽
  v_content_preview := LEFT(NEW.content, 120);
  IF LENGTH(NEW.content) > 120 THEN
    v_content_preview := v_content_preview || '...';
  END IF;
  
  -- 9. 建立去重 key
  v_dedupe_key := v_receiver_id::text || ':' || NEW.conversation_id::text || ':' || 
                  date_trunc('minute', NOW())::text;
  
  -- 10. 插入 email_outbox
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
      'created_at', NEW.created_at,
      'message_count', 1
    ),
    v_dedupe_key,
    'pending',
    0,
    v_scheduled_for,
    NOW(),
    NOW()
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'processing', 'sent')
  DO UPDATE SET
    payload = email_outbox.payload || jsonb_build_object(
      'latest_message_id', NEW.id,
      'latest_content_preview', v_content_preview,
      'message_count', COALESCE((email_outbox.payload->>'message_count')::integer, 1) + 1
    ),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'enqueue_message_email_v2 failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新 trigger 使用新版本
DROP TRIGGER IF EXISTS trigger_enqueue_message_email ON public.messages;
CREATE TRIGGER trigger_enqueue_message_email
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_message_email_v2();

-- ============================================
-- 7. RLS Policies
-- ============================================

ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- email_jobs：僅 service role 可存取
DROP POLICY IF EXISTS "Service role full access on email_jobs" ON public.email_jobs;
CREATE POLICY "Service role full access on email_jobs"
  ON public.email_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

-- user_interests：用戶可讀寫自己的興趣
DROP POLICY IF EXISTS "Users can view own interests" ON public.user_interests;
CREATE POLICY "Users can view own interests"
  ON public.user_interests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interests" ON public.user_interests;
CREATE POLICY "Users can insert own interests"
  ON public.user_interests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interests" ON public.user_interests;
CREATE POLICY "Users can delete own interests"
  ON public.user_interests
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. Grant permissions
-- ============================================

GRANT ALL ON public.email_jobs TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_interests TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recommendation_digest() TO service_role;

-- ============================================
-- 完成訊息
-- ============================================

SELECT 'Migration completed: Email Notification Extended System' AS status;

