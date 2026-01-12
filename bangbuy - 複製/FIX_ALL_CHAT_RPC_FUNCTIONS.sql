-- ============================================
-- 修復所有聊天相關 RPC 函數
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- ============================================
-- 1. get_conversation_list
-- ============================================

-- 刪除所有舊版本
DROP FUNCTION IF EXISTS public.get_conversation_list();
DROP FUNCTION IF EXISTS public.get_conversation_list(int);
DROP FUNCTION IF EXISTS public.get_conversation_list(int, timestamptz);
DROP FUNCTION IF EXISTS public.get_conversation_list(timestamptz, int);
DROP FUNCTION IF EXISTS public.get_conversation_list(integer, integer, text);

-- 創建無參數版本
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

-- ============================================
-- 2. 確保 messages 表有必要的欄位
-- ============================================

-- 添加 status 欄位（如果不存在）
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;

-- 為現有資料填充預設值
UPDATE public.messages SET status = 'sent' WHERE status IS NULL;
UPDATE public.messages SET client_message_id = id::text WHERE client_message_id IS NULL;

-- 確保 client_message_id 有唯一約束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_conversation_id_client_message_id_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_id 
    ON public.messages(conversation_id, client_message_id);
  END IF;
END $$;

-- ============================================
-- 3. get_messages
-- ============================================

-- 刪除所有舊版本
DROP FUNCTION IF EXISTS public.get_messages(uuid);
DROP FUNCTION IF EXISTS public.get_messages(uuid, int);
DROP FUNCTION IF EXISTS public.get_messages(uuid, int, timestamptz);

-- 創建 get_messages RPC
CREATE OR REPLACE FUNCTION public.get_messages(
  p_conversation_id uuid
)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  content text,
  client_message_id text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.sender_id,
    m.content,
    COALESCE(m.client_message_id, m.id::text) AS client_message_id,
    COALESCE(m.status, 'sent') AS status,
    m.created_at
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = p_conversation_id
    AND auth.uid() IN (c.user1_id, c.user2_id)
  ORDER BY m.created_at ASC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_messages(uuid) TO authenticated;

-- ============================================
-- 4. mark_as_read
-- ============================================

-- 刪除舊版本
DROP FUNCTION IF EXISTS public.mark_as_read(uuid);

-- 創建 mark_as_read RPC
CREATE OR REPLACE FUNCTION public.mark_as_read(
  p_conversation_id uuid
)
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

-- ============================================
-- 5. get_or_create_conversation
-- ============================================

-- 刪除舊版本
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, text);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, text, uuid, text);

-- 創建 get_or_create_conversation RPC
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_target uuid,
  p_source_type text DEFAULT 'direct',
  p_source_id uuid DEFAULT NULL,
  p_source_title text DEFAULT NULL
)
RETURNS TABLE (
  conversation_id uuid,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_id uuid := auth.uid();
  v_low_id uuid;
  v_high_id uuid;
  v_conv_id uuid;
  v_source_type text;
  v_source_key text;
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
  SELECT c.id INTO v_conv_id
  FROM public.conversations c
  WHERE (c.user1_id = v_my_id AND c.user2_id = p_target)
     OR (c.user1_id = p_target AND c.user2_id = v_my_id)
  LIMIT 1;
  
  IF v_conv_id IS NOT NULL THEN
    RETURN QUERY SELECT v_conv_id, FALSE;
    RETURN;
  END IF;
  
  -- 建立新對話
  INSERT INTO public.conversations (
    user1_id, user2_id,
    source_type, source_id, source_title, source_key,
    last_message_at, created_at, updated_at
  )
  VALUES (
    v_my_id, p_target,
    v_source_type, p_source_id, p_source_title, v_source_key,
    NOW(), NOW(), NOW()
  )
  RETURNING id INTO v_conv_id;
  
  RETURN QUERY SELECT v_conv_id, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid, text, uuid, text) TO authenticated;

-- ============================================
-- 6. send_message
-- ============================================

-- 刪除舊版本
DROP FUNCTION IF EXISTS public.send_message(uuid, text, text);

-- 創建 send_message RPC
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_content text,
  p_client_message_id text
)
RETURNS TABLE (
  message_id uuid,
  error_code text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_other_user_id uuid;
  v_is_blocked boolean;
  v_message_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'NOT_AUTHENTICATED'::text, 'User not authenticated'::text;
    RETURN;
  END IF;
  
  -- 獲取對方 ID
  SELECT CASE WHEN user1_id = v_current_user_id THEN user2_id ELSE user1_id END
  INTO v_other_user_id
  FROM public.conversations
  WHERE id = p_conversation_id
    AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  IF v_other_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'NOT_PARTICIPANT'::text, '您不是此對話的參與者'::text;
    RETURN;
  END IF;
  
  -- 檢查封鎖（如果 blocks 表存在）
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = v_current_user_id AND blocked_id = v_other_user_id)
         OR (blocker_id = v_other_user_id AND blocked_id = v_current_user_id)
    ) INTO v_is_blocked;
    
    IF v_is_blocked THEN
      RETURN QUERY SELECT NULL::uuid, 'BLOCKED'::text, '無法發送訊息（已封鎖）'::text;
      RETURN;
    END IF;
  END IF;
  
  -- 插入訊息（使用 ON CONFLICT 處理重複）
  INSERT INTO public.messages (conversation_id, sender_id, content, client_message_id, status)
  VALUES (p_conversation_id, v_current_user_id, p_content, p_client_message_id, 'sent')
  ON CONFLICT (conversation_id, client_message_id) DO NOTHING
  RETURNING id INTO v_message_id;
  
  -- 如果是重複的，查詢已存在的
  IF v_message_id IS NULL THEN
    SELECT id INTO v_message_id
    FROM public.messages
    WHERE conversation_id = p_conversation_id AND client_message_id = p_client_message_id;
  END IF;
  
  -- 更新對話的 last_message_at 和 last_message_preview
  UPDATE public.conversations
  SET
    last_message_at = NOW(),
    last_message_preview = LEFT(p_content, 100),
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN QUERY SELECT v_message_id, NULL::text, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text) TO authenticated;

-- ============================================
-- 驗證
-- ============================================

SELECT '✅ 所有聊天 RPC 函數已創建！' AS status;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_conversation_list',
    'get_messages',
    'mark_as_read',
    'get_or_create_conversation',
    'send_message'
  )
ORDER BY routine_name;

