-- ============================================
-- 🔐 修正 get_conversation_list RPC
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 先刪除舊版本（如果存在）
DROP FUNCTION IF EXISTS public.get_conversation_list(int, int, text);
DROP FUNCTION IF EXISTS public.get_conversation_list(integer, integer, text);

-- 創建新版本的 RPC
CREATE OR REPLACE FUNCTION public.get_conversation_list(
  p_limit int default 30,
  p_before timestamptz default null
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

-- 授權給已認證用戶
GRANT EXECUTE ON FUNCTION public.get_conversation_list(int, timestamptz) TO authenticated;

-- 驗證
SELECT '✅ get_conversation_list RPC 已創建！' AS status;












