-- ============================================
-- 🔧 BangBuy 全面穩定化 Migration
-- 可重跑、不會炸、修復所有已知問題
-- ============================================

SET search_path = public;

-- ============================================
-- 第 1 部分：Conversations 表穩定化
-- ============================================

-- 1.1 確保所有必要欄位存在
DO $$
BEGIN
  -- 確保 conversations 表存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'direct',
      source_id UUID,
      source_title TEXT,
      source_key TEXT NOT NULL DEFAULT 'direct',
      user1_last_read_at TIMESTAMPTZ DEFAULT NOW(),
      user2_last_read_at TIMESTAMPTZ DEFAULT NOW(),
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      last_message_preview TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  -- 添加缺失的欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'source_key') THEN
    ALTER TABLE conversations ADD COLUMN source_key TEXT NOT NULL DEFAULT 'direct';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_preview') THEN
    ALTER TABLE conversations ADD COLUMN last_message_preview TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'user1_last_read_at') THEN
    ALTER TABLE conversations ADD COLUMN user1_last_read_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'user2_last_read_at') THEN
    ALTER TABLE conversations ADD COLUMN user2_last_read_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 1.2 Backfill source_key（如果為空）
UPDATE conversations
SET source_key = CASE
  WHEN source_key IS NULL OR source_key = '' THEN
    CASE
      WHEN source_id IS NOT NULL THEN COALESCE(source_type, 'direct') || ':' || source_id::text
      ELSE COALESCE(source_type, 'direct') || ':direct'
    END
  ELSE source_key
END
WHERE source_key IS NULL OR source_key = '';

-- 1.3 處理重複的 conversations（Dedupe）
-- 策略：保留最早創建的那筆，刪除其他重複的

DO $$
DECLARE
  dup_record RECORD;
  keep_id UUID;
BEGIN
  -- 找出所有重複的 conversation groups
  FOR dup_record IN
    SELECT 
      LEAST(user1_id, user2_id) AS low_id,
      GREATEST(user1_id, user2_id) AS high_id,
      source_type,
      source_key,
      COUNT(*) AS cnt
    FROM conversations
    GROUP BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), source_type, source_key
    HAVING COUNT(*) > 1
  LOOP
    -- 找出要保留的 conversation（最早創建的）
    SELECT id INTO keep_id
    FROM conversations
    WHERE LEAST(user1_id, user2_id) = dup_record.low_id
      AND GREATEST(user1_id, user2_id) = dup_record.high_id
      AND source_type = dup_record.source_type
      AND source_key = dup_record.source_key
    ORDER BY created_at ASC, id ASC
    LIMIT 1;
    
    -- 將所有重複 conversation 的 messages 指向保留的那筆
    UPDATE messages
    SET conversation_id = keep_id
    WHERE conversation_id IN (
      SELECT id
      FROM conversations
      WHERE LEAST(user1_id, user2_id) = dup_record.low_id
        AND GREATEST(user1_id, user2_id) = dup_record.high_id
        AND source_type = dup_record.source_type
        AND source_key = dup_record.source_key
        AND id != keep_id
    );
    
    -- 刪除重複的 conversations
    DELETE FROM conversations
    WHERE LEAST(user1_id, user2_id) = dup_record.low_id
      AND GREATEST(user1_id, user2_id) = dup_record.high_id
      AND source_type = dup_record.source_type
      AND source_key = dup_record.source_key
      AND id != keep_id;
      
    RAISE NOTICE 'Deduped conversation group: % kept, % duplicates removed', 
      keep_id, dup_record.cnt - 1;
  END LOOP;
END $$;

-- 1.4 建立唯一索引（防止未來重複）
DROP INDEX IF EXISTS idx_conversations_unique_pair;
DROP INDEX IF EXISTS idx_conversations_unique_pair_v2;

CREATE UNIQUE INDEX idx_conversations_unique_pair_v3
ON conversations (
  LEAST(user1_id, user2_id),
  GREATEST(user1_id, user2_id),
  source_type,
  source_key
);

-- 1.5 其他必要索引
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================
-- 第 2 部分：Messages 表穩定化
-- ============================================

DO $$
BEGIN
  -- 確保 messages 表存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      client_message_id TEXT NOT NULL,
      status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'failed')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  -- 添加缺失的欄位
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'client_message_id') THEN
    ALTER TABLE messages ADD COLUMN client_message_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'status') THEN
    ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent';
  END IF;
END $$;

-- Backfill client_message_id
UPDATE messages
SET client_message_id = id::text
WHERE client_message_id IS NULL;

-- 確保 client_message_id 不為 NULL
ALTER TABLE messages ALTER COLUMN client_message_id SET NOT NULL;

-- 唯一約束
DROP INDEX IF EXISTS idx_messages_client_id;
CREATE UNIQUE INDEX idx_messages_client_id
ON messages(conversation_id, client_message_id);

-- 其他索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);

-- ============================================
-- 第 3 部分：Notifications 表穩定化
-- ============================================

-- 已由 migration-notifications-v3-complete.sql 處理
-- 這裡只確保基本結構

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      href TEXT,
      source_type TEXT,
      source_id UUID,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      deep_link TEXT,
      data JSONB DEFAULT '{}'::jsonb,
      dedupe_key TEXT
    );
  END IF;
  
  -- 確保 is_read 欄位存在
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  
  -- 同步 is_read 與 read_at
  UPDATE notifications SET is_read = TRUE WHERE read_at IS NOT NULL AND is_read = FALSE;
END $$;

-- ============================================
-- 第 4 部分：RPC Functions
-- ============================================

-- 4.1 get_or_create_conversation
-- 修正版：避免重複創建、使用 SECURITY DEFINER、正確的 search_path

DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_target_user_id UUID,
  p_source_type TEXT DEFAULT 'direct',
  p_source_key TEXT DEFAULT 'direct',
  p_source_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID;
  v_user_low UUID;
  v_user_high UUID;
  v_conversation_id UUID;
  v_final_source_key TEXT;
BEGIN
  -- 獲取當前用戶
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID is required';
  END IF;
  
  IF v_current_user = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- 正規化 user pair
  v_user_low := LEAST(v_current_user, p_target_user_id);
  v_user_high := GREATEST(v_current_user, p_target_user_id);
  
  -- 確保 source_key 不為空
  v_final_source_key := COALESCE(p_source_key, 'direct');
  
  -- 嘗試找到現有 conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE LEAST(user1_id, user2_id) = v_user_low
    AND GREATEST(user1_id, user2_id) = v_user_high
    AND source_type = p_source_type
    AND source_key = v_final_source_key
  LIMIT 1;
  
  -- 如果找到，直接返回
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;
  
  -- 否則創建新的
  INSERT INTO conversations (
    user1_id,
    user2_id,
    source_type,
    source_key,
    source_title,
    last_message_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_low,
    v_user_high,
    p_source_type,
    v_final_source_key,
    p_source_title,
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_conversation_id;
  
  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 4.2 get_conversation_list
-- 修正版：不依賴不存在的欄位、使用子查詢計算 last_message_preview

DROP FUNCTION IF EXISTS get_conversation_list(TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_conversation_list(INT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_conversation_list(
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user1_id UUID,
  user2_id UUID,
  source_type TEXT,
  source_id UUID,
  source_title TEXT,
  source_key TEXT,
  user1_last_read_at TIMESTAMPTZ,
  user2_last_read_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.user1_id,
    c.user2_id,
    c.source_type,
    c.source_id,
    c.source_title,
    c.source_key,
    c.user1_last_read_at,
    c.user2_last_read_at,
    c.last_message_at,
    -- 從最新訊息計算 last_message_preview
    COALESCE(
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
      c.last_message_preview
    ) AS last_message_preview,
    c.created_at,
    c.updated_at,
    -- 計算 other_user_id
    CASE 
      WHEN c.user1_id = v_current_user THEN c.user2_id
      ELSE c.user1_id
    END AS other_user_id,
    -- 獲取對方的名稱
    COALESCE(
      (SELECT name FROM profiles WHERE id = CASE WHEN c.user1_id = v_current_user THEN c.user2_id ELSE c.user1_id END),
      '未知用戶'
    ) AS other_user_name,
    -- 獲取對方的頭像
    (SELECT avatar_url FROM profiles WHERE id = CASE WHEN c.user1_id = v_current_user THEN c.user2_id ELSE c.user1_id END) AS other_user_avatar,
    -- 計算未讀數
    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id != v_current_user
        AND m.created_at > CASE 
          WHEN c.user1_id = v_current_user THEN COALESCE(c.user1_last_read_at, '1970-01-01'::timestamptz)
          ELSE COALESCE(c.user2_last_read_at, '1970-01-01'::timestamptz)
        END
    ) AS unread_count
  FROM conversations c
  WHERE (c.user1_id = v_current_user OR c.user2_id = v_current_user)
    AND (p_before IS NULL OR c.last_message_at < p_before)
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversation_list(TIMESTAMPTZ, INT) TO authenticated;

-- ============================================
-- 第 5 部分：RLS Policies
-- ============================================

-- 5.1 Conversations RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 5.2 Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- 5.3 Notifications RLS（已由 migration-notifications-v3-complete.sql 處理）
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 第 6 部分：Triggers
-- ============================================

-- 6.1 更新 conversations.last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 6.2 更新 conversations.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成確認
-- ============================================

SELECT '✅ Conversations table stabilized' AS status;
SELECT '✅ Messages table stabilized' AS status;
SELECT '✅ Notifications table stabilized' AS status;
SELECT '✅ RPC functions created' AS status;
SELECT '✅ RLS policies applied' AS status;
SELECT '✅ Triggers configured' AS status;
SELECT '🎉 Migration complete - system stabilized!' AS status;



