-- ============================================
-- 🔐 BangBuy 簡化版 RPC（直接複製到 Supabase 執行）
-- ============================================

-- Step 1: 確保必要欄位存在
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user1_last_read_at TIMESTAMPTZ;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user2_last_read_at TIMESTAMPTZ;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS source_key TEXT;

-- Step 2: 刪除所有舊版本的 RPC（避免簽名衝突）
DROP FUNCTION IF EXISTS public.get_conversation_list(timestamptz, int);
DROP FUNCTION IF EXISTS public.get_conversation_list(int, timestamptz);
DROP FUNCTION IF EXISTS public.get_conversation_list();
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(text, uuid, uuid, text);

-- Step 3: 創建 get_conversation_list（簡化版，無參數）
CREATE OR REPLACE FUNCTION public.get_conversation_list()
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
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT 50
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content AS last_message_preview
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

GRANT EXECUTE ON FUNCTION public.get_conversation_list() TO authenticated;

-- Step 4: 創建 get_or_create_conversation（簡化版）
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_target_user uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  v_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_target_user IS NULL OR p_target_user = me THEN
    RAISE EXCEPTION 'invalid target user';
  END IF;

  -- 先找現有的對話
  SELECT c.id INTO v_id
  FROM public.conversations c
  WHERE (c.user1_id = me AND c.user2_id = p_target_user)
     OR (c.user1_id = p_target_user AND c.user2_id = me)
  LIMIT 1;

  -- 找不到就創建
  IF v_id IS NULL THEN
    INSERT INTO public.conversations(user1_id, user2_id, source_type, last_message_at, created_at, updated_at)
    VALUES(me, p_target_user, 'direct', NOW(), NOW(), NOW())
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- Step 5: 驗證
SELECT '✅ RPC 創建成功！' AS status;

-- 測試 RPC 是否存在
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_conversation_list', 'get_or_create_conversation');








