-- ============================================
-- 🔐 BangBuy 訊息相關 RPC（補充）
-- 在 Supabase SQL Editor 執行
-- ============================================

-- Step 1: 添加 messages.status 欄位（如果不存在）
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;

-- Step 2: 刪除舊版 RPC
DROP FUNCTION IF EXISTS public.get_messages(uuid, int, timestamptz);
DROP FUNCTION IF EXISTS public.mark_as_read(uuid);

-- Step 3: 創建 get_messages RPC
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

-- Step 4: 創建 mark_as_read RPC
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

-- Step 5: 驗證
SELECT '✅ 訊息相關 RPC 創建成功！' AS status;

SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_messages', 'mark_as_read');















