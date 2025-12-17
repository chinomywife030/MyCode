-- ============================================
-- 🔐 BangBuy 聊天系統 - 一次修掉所有問題
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

SET search_path = public;

-- =========================
-- PART 0: 添加缺失的欄位
-- =========================

-- 添加 user_low_id, user_high_id（用於正規化 user pair）
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_low_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_high_id UUID;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS source_key TEXT;

-- 添加 last_read_at 欄位（如果不存在）
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user1_last_read_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user2_last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill 現有資料
UPDATE public.conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id),
  source_key = CASE
    WHEN source_id IS NULL THEN COALESCE(source_type, 'direct') || ':direct'
    ELSE COALESCE(source_type, 'direct') || ':' || source_id::text
  END
WHERE user_low_id IS NULL OR user_high_id IS NULL OR source_key IS NULL;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_low_high 
ON public.conversations(user_low_id, user_high_id);

CREATE INDEX IF NOT EXISTS idx_conversations_source_key 
ON public.conversations(source_key);

-- 創建唯一約束（避免重複聊天室）
DROP INDEX IF EXISTS idx_conversations_unique_pair_v2;
CREATE UNIQUE INDEX idx_conversations_unique_pair_v2
ON public.conversations(user_low_id, user_high_id, source_type, source_key);

-- =========================
-- PART 1: RPC get_conversation_list
-- 注意：參數順序是 p_before, p_limit
-- =========================

DROP FUNCTION IF EXISTS public.get_conversation_list(timestamptz, int);
DROP FUNCTION IF EXISTS public.get_conversation_list(int, timestamptz);

CREATE OR REPLACE FUNCTION public.get_conversation_list(
  p_before timestamptz DEFAULT NULL,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  other_user_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_convs AS (
    SELECT
      c.id,
      CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END AS other_user_id,
      c.last_message_at,
      CASE WHEN c.user1_id = auth.uid() THEN c.user1_last_read_at ELSE c.user2_last_read_at END AS my_last_read_at
    FROM public.conversations c
    WHERE auth.uid() IN (c.user1_id, c.user2_id)
      AND (p_before IS NULL OR c.last_message_at < p_before)
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content AS last_message_preview,
      m.created_at AS last_message_created_at
    FROM public.messages m
    JOIN my_convs mc ON mc.id = m.conversation_id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread AS (
    SELECT
      mc.id AS conversation_id,
      COUNT(*)::int AS unread_count
    FROM my_convs mc
    JOIN public.messages m ON m.conversation_id = mc.id
    WHERE m.sender_id <> auth.uid()
      AND (mc.my_last_read_at IS NULL OR m.created_at > mc.my_last_read_at)
    GROUP BY mc.id
  )
  SELECT
    mc.id,
    mc.other_user_id,
    mc.last_message_at,
    COALESCE(lm.last_message_preview, '') AS last_message_preview,
    COALESCE(u.unread_count, 0) AS unread_count
  FROM my_convs mc
  LEFT JOIN last_msg lm ON lm.conversation_id = mc.id
  LEFT JOIN unread u ON u.conversation_id = mc.id
  ORDER BY mc.last_message_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_list(timestamptz, int) TO authenticated;

-- =========================
-- PART 2: RPC get_or_create_conversation
-- =========================

DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_target_user uuid,
  p_source_type text DEFAULT 'direct',
  p_source_id uuid DEFAULT NULL,
  p_source_title text DEFAULT NULL
)
RETURNS TABLE (
  conversation_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  u_low uuid;
  u_high uuid;
  v_source_key text;
  v_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_target_user IS NULL OR p_target_user = me THEN
    RAISE EXCEPTION 'invalid target user';
  END IF;

  -- 固定排序 pair key
  u_low := LEAST(me, p_target_user);
  u_high := GREATEST(me, p_target_user);

  -- source_key: direct 用 'direct:direct', 有 source_id 用 'type:uuid'
  IF p_source_type IS NULL OR p_source_type = '' THEN
    p_source_type := 'direct';
  END IF;

  IF p_source_id IS NULL THEN
    v_source_key := p_source_type || ':direct';
  ELSE
    v_source_key := p_source_type || ':' || p_source_id::text;
  END IF;

  -- 先找（使用正規化的 user pair）
  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE c.user_low_id = u_low
    AND c.user_high_id = u_high
    AND c.source_type = p_source_type
    AND c.source_key = v_source_key
  LIMIT 1;

  -- 如果找不到，嘗試舊格式
  IF v_id IS NULL THEN
    SELECT c.id INTO v_id
    FROM public.conversations c
    WHERE ((c.user1_id = u_low AND c.user2_id = u_high) OR (c.user1_id = u_high AND c.user2_id = u_low))
      AND c.source_type = p_source_type
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.conversations(
      user1_id, user2_id,
      user_low_id, user_high_id,
      source_type, source_id, source_title, source_key,
      last_message_at, created_at, updated_at
    )
    VALUES(
      me, p_target_user,
      u_low, u_high,
      p_source_type, p_source_id, p_source_title, v_source_key,
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (user_low_id, user_high_id, source_type, source_key) 
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_id;
  END IF;

  conversation_id := v_id;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, text, uuid, text) TO authenticated;

-- =========================
-- PART 3: 其他輔助 RPC
-- =========================

-- mark_as_read
CREATE OR REPLACE FUNCTION public.mark_as_read(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET
    user1_last_read_at = CASE WHEN user1_id = auth.uid() THEN NOW() ELSE user1_last_read_at END,
    user2_last_read_at = CASE WHEN user2_id = auth.uid() THEN NOW() ELSE user2_last_read_at END
  WHERE id = p_conversation_id
    AND auth.uid() IN (user1_id, user2_id);
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_as_read(uuid) TO authenticated;

-- is_blocked
CREATE OR REPLACE FUNCTION public.is_blocked(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;

-- block_user
CREATE OR REPLACE FUNCTION public.block_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.blocks (blocker_id, blocked_id, reason)
  VALUES (auth.uid(), p_user_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid, text) TO authenticated;

-- unblock_user
CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.blocks
  WHERE blocker_id = auth.uid() AND blocked_id = p_user_id;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- report_user
CREATE OR REPLACE FUNCTION public.report_user(
  p_user_id uuid,
  p_reason text,
  p_description text DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  INSERT INTO public.reports (reporter_id, reported_id, reason, description, conversation_id)
  VALUES (auth.uid(), p_user_id, p_reason, p_description, p_conversation_id)
  RETURNING id INTO v_report_id;
  RETURN v_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_user(uuid, text, text, uuid) TO authenticated;

-- =========================
-- 完成驗證
-- =========================

SELECT '✅ 所有 RPC 已創建成功！' AS status;
SELECT 
  routine_name, 
  string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position) AS params
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
  AND routine_name IN ('get_conversation_list', 'get_or_create_conversation')
GROUP BY routine_name;







