-- ============================================
-- 修復 messages 表 RLS 策略（最小必要）
-- 確保對話成員可以 insert messages
-- ============================================

-- 確保 messages 表啟用 RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 INSERT policy（如果存在）
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages if not blocked" ON public.messages;

-- 創建最小必要的 INSERT policy
-- 要求：
-- 1. sender_id 必須等於 auth.uid()
-- 2. 用戶必須是對話的參與者（user1_id 或 user2_id）
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (
    -- 發送者必須是當前用戶
    auth.uid() = sender_id
    AND
    -- 用戶必須是對話的參與者
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- 確保 SELECT policy 存在（用於讀取訊息）
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;

CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- 驗證
SELECT '✅ messages RLS policies 已修復！' AS status;





