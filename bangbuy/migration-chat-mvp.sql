-- ============================================
-- BangBuy 私訊 MVP - 完整 Migration
-- 使用 conversation_members 表結構
-- ============================================

SET search_path = public;

-- ============================================
-- PART 1: 建立資料表
-- ============================================

-- 1. conversations 表（聊天室）
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT CHECK (source_type IN ('wish_request', 'trip', 'listing', 'legacy', 'direct')),
  source_id UUID,
  source_title TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. conversation_members 表（聊天室成員）
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 3. messages 表（訊息）
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  client_message_id TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, client_message_id)
);

-- ============================================
-- PART 2: 建立索引
-- ============================================

-- conversations 索引
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source_type, source_id);

-- conversation_members 索引
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_last_read ON conversation_members(user_id, last_read_at);

-- messages 索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ============================================
-- PART 3: RLS 政策
-- ============================================

-- 啟用 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations RLS
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON conversations;
CREATE POLICY "Users can view conversations they are members of"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert conversations" ON conversations;
CREATE POLICY "System can insert conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update conversations" ON conversations;
CREATE POLICY "System can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- conversation_members RLS
DROP POLICY IF EXISTS "Users can view their own memberships" ON conversation_members;
CREATE POLICY "Users can view their own memberships"
  ON conversation_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert members" ON conversation_members;
CREATE POLICY "System can insert members"
  ON conversation_members FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own memberships" ON conversation_members;
CREATE POLICY "Users can update their own memberships"
  ON conversation_members FOR UPDATE
  USING (user_id = auth.uid());

-- messages RLS
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- ============================================
-- PART 4: RPC 函數
-- ============================================

-- 4.1 get_or_create_conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_target_user_id UUID,
  p_source_type TEXT DEFAULT 'direct',
  p_source_id UUID DEFAULT NULL,
  p_source_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation_id UUID;
  v_existing_conversation_id UUID;
  v_source_key TEXT;
  v_is_new BOOLEAN := false;
BEGIN
  -- 獲取當前用戶
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- 不能與自己建立對話
  IF v_current_user_id = p_target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot create conversation with yourself'
    );
  END IF;

  -- 生成 source_key
  v_source_key := COALESCE(p_source_type, 'direct') || ':' || COALESCE(p_source_id::text, 'direct');

  -- 查找現有對話（兩個用戶 + 相同 source_key）
  SELECT c.id INTO v_existing_conversation_id
  FROM conversations c
  WHERE c.source_type = p_source_type
    AND (c.source_id = p_source_id OR (c.source_id IS NULL AND p_source_id IS NULL))
    AND EXISTS (
      SELECT 1 FROM conversation_members cm1
      WHERE cm1.conversation_id = c.id AND cm1.user_id = v_current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = c.id AND cm2.user_id = p_target_user_id
    )
  LIMIT 1;

  -- 如果找到現有對話，返回
  IF v_existing_conversation_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'conversation_id', v_existing_conversation_id,
      'is_new', false
    );
  END IF;

  -- 建立新對話
  INSERT INTO conversations (source_type, source_id, source_title)
  VALUES (p_source_type, p_source_id, p_source_title)
  RETURNING id INTO v_conversation_id;

  -- 添加兩個成員
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (v_conversation_id, v_current_user_id);

  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (v_conversation_id, p_target_user_id);

  v_is_new := true;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation_id,
    'is_new', true
  );
END;
$$;

-- 4.2 get_conversation_list
CREATE OR REPLACE FUNCTION get_conversation_list(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  source_type TEXT,
  source_id UUID,
  source_title TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    CASE
      WHEN cm1.user_id = v_current_user_id THEN cm2.user_id
      ELSE cm1.user_id
    END AS other_user_id,
    COALESCE(p.name, '匿名用戶') AS other_user_name,
    p.avatar_url AS other_user_avatar,
    c.source_type,
    c.source_id,
    c.source_title,
    c.last_message_at,
    c.last_message_preview,
    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id != v_current_user_id
        AND m.created_at > COALESCE(
          (SELECT last_read_at FROM conversation_members
           WHERE conversation_id = c.id AND user_id = v_current_user_id),
          '1970-01-01'::timestamptz
        )
    ) AS unread_count,
    c.created_at
  FROM conversations c
  INNER JOIN conversation_members cm1 ON cm1.conversation_id = c.id
  INNER JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id != cm1.user_id
  LEFT JOIN profiles p ON p.id = CASE
    WHEN cm1.user_id = v_current_user_id THEN cm2.user_id
    ELSE cm1.user_id
  END
  WHERE cm1.user_id = v_current_user_id
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4.3 get_messages
CREATE OR REPLACE FUNCTION get_messages(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  client_message_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 檢查用戶是否是對話成員
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = v_current_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.sender_id,
    COALESCE(p.name, '匿名用戶') AS sender_name,
    p.avatar_url AS sender_avatar,
    m.content,
    m.client_message_id,
    m.status,
    m.created_at
  FROM messages m
  LEFT JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
    AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 4.4 send_message
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_client_message_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_message_id UUID;
  v_preview TEXT;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- 檢查用戶是否是對話成員
  IF NOT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = v_current_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this conversation');
  END IF;

  -- 插入訊息
  INSERT INTO messages (conversation_id, sender_id, content, client_message_id)
  VALUES (p_conversation_id, v_current_user_id, p_content, p_client_message_id)
  RETURNING id INTO v_message_id;

  -- 更新對話的 last_message_at 和 last_message_preview
  v_preview := LEFT(p_content, 100);
  UPDATE conversations
  SET
    last_message_at = NOW(),
    last_message_preview = v_preview,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$;

-- 4.5 mark_as_read
CREATE OR REPLACE FUNCTION mark_as_read(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 更新用戶的 last_read_at
  UPDATE conversation_members
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_current_user_id;

  RETURN FOUND;
END;
$$;





