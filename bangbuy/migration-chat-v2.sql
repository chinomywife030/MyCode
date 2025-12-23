-- ============================================
-- 🔐 BangBuy 聊天系統 V2 - Production Ready
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- ============================================
-- PART 1: 表結構（如果不存在則創建）
-- ============================================

-- 1. conversations 資料表
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'direct' CHECK (source_type IN ('wish_request', 'trip', 'listing', 'legacy', 'direct')),
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

-- 2. messages 資料表
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

-- 3. blocks 資料表
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- 4. reports 資料表
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('scam', 'harassment', 'fake_goods', 'personal_info', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: 添加缺失的欄位（如果表已存在）
-- ============================================

-- conversations 新增欄位
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_key TEXT DEFAULT 'direct';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user1_last_read_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user2_last_read_at TIMESTAMPTZ DEFAULT NOW();

-- messages 新增欄位
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- 填充現有資料的 source_key
UPDATE conversations
SET source_key = CASE
  WHEN source_type = 'direct' THEN 'direct'
  WHEN source_type = 'legacy' THEN 'legacy'
  WHEN source_id IS NOT NULL THEN source_id::text
  ELSE 'direct'
END
WHERE source_key IS NULL OR source_key = '';

-- 填充現有訊息的 client_message_id
UPDATE messages
SET client_message_id = id::text
WHERE client_message_id IS NULL;

-- ============================================
-- PART 3: 索引
-- ============================================

-- 唯一約束：正規化的 user pair + source
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
ON conversations (
  LEAST(user1_id, user2_id),
  GREATEST(user1_id, user2_id),
  source_type,
  source_key
);

-- 其他索引
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(conversation_id, client_message_id);
CREATE INDEX IF NOT EXISTS idx_blocks_pair ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_reverse ON blocks(blocked_id, blocker_id);

-- ============================================
-- PART 4: RLS 政策
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- conversations RLS
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 🔐 禁止前端直接 INSERT conversations（只能通過 RPC）
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
-- 不創建 INSERT policy，強制使用 RPC

-- messages RLS
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      JOIN conversations c ON c.id = conversation_id
      WHERE (b.blocker_id = c.user1_id AND b.blocked_id = c.user2_id)
         OR (b.blocker_id = c.user2_id AND b.blocked_id = c.user1_id)
    )
  );

-- blocks RLS
DROP POLICY IF EXISTS "blocks_select" ON blocks;
CREATE POLICY "blocks_select" ON blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "blocks_insert" ON blocks;
CREATE POLICY "blocks_insert" ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "blocks_delete" ON blocks;
CREATE POLICY "blocks_delete" ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- reports RLS
DROP POLICY IF EXISTS "reports_select" ON reports;
CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- PART 5: 觸發器 - 更新 last_message_at 和 preview
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 50),
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- PART 6: RPC - get_or_create_conversation（核心）
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_target_user_id UUID,
  p_source_type TEXT DEFAULT 'direct',
  p_source_id UUID DEFAULT NULL,
  p_source_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  is_new BOOLEAN,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_current_user_id UUID;
  v_user_low UUID;
  v_user_high UUID;
  v_source_key TEXT;
  v_conversation_id UUID;
  v_user_created_at TIMESTAMPTZ;
  v_hours_since_creation NUMERIC;
  v_is_blocked BOOLEAN;
BEGIN
  -- 獲取當前用戶
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'AUTH_REQUIRED', '請先登入';
    RETURN;
  END IF;
  
  -- 不能跟自己聊天
  IF v_current_user_id = p_target_user_id THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'SELF_CHAT', '不能與自己對話';
    RETURN;
  END IF;
  
  -- 檢查目標用戶是否存在
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_target_user_id) THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'USER_NOT_FOUND', '找不到該用戶';
    RETURN;
  END IF;
  
  -- 檢查封鎖狀態
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_target_user_id)
       OR (blocker_id = p_target_user_id AND blocked_id = v_current_user_id)
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'BLOCKED', '無法與此用戶對話（已封鎖）';
    RETURN;
  END IF;
  
  -- 正規化 user pair（較小的 UUID 在前）
  IF v_current_user_id < p_target_user_id THEN
    v_user_low := v_current_user_id;
    v_user_high := p_target_user_id;
  ELSE
    v_user_low := p_target_user_id;
    v_user_high := v_current_user_id;
  END IF;
  
  -- 生成 source_key
  v_source_key := CASE
    WHEN p_source_type = 'direct' THEN 'direct'
    WHEN p_source_type = 'legacy' THEN 'legacy'
    WHEN p_source_id IS NOT NULL THEN p_source_id::text
    ELSE 'direct'
  END;
  
  -- 先查詢是否存在
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE (
    (c.user1_id = v_user_low AND c.user2_id = v_user_high) OR
    (c.user1_id = v_user_high AND c.user2_id = v_user_low)
  )
  AND c.source_type = p_source_type
  AND c.source_key = v_source_key
  LIMIT 1;
  
  IF v_conversation_id IS NOT NULL THEN
    -- 已存在，直接返回
    RETURN QUERY SELECT v_conversation_id, FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- 檢查新帳號限制（只在創建新對話時檢查）
  SELECT created_at INTO v_user_created_at
  FROM profiles WHERE id = v_current_user_id;
  
  v_hours_since_creation := EXTRACT(EPOCH FROM (NOW() - v_user_created_at)) / 3600;
  
  IF v_hours_since_creation < 24 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'NEW_ACCOUNT', 
      '新帳號保護：註冊未滿 24 小時，暫時無法主動開啟新聊天。請等待 ' || 
      CEIL(24 - v_hours_since_creation)::TEXT || ' 小時後再試。';
    RETURN;
  END IF;
  
  -- 創建新對話
  INSERT INTO conversations (
    user1_id, user2_id, source_type, source_id, source_title, source_key,
    user1_last_read_at, user2_last_read_at
  )
  VALUES (
    v_user_low, v_user_high, p_source_type, p_source_id, p_source_title, v_source_key,
    NOW(), NOW()
  )
  ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), source_type, source_key)
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_conversation_id;
  
  RETURN QUERY SELECT v_conversation_id, TRUE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: RPC - is_blocked（安全檢查封鎖狀態）
-- ============================================

CREATE OR REPLACE FUNCTION is_blocked(p_user_a UUID, p_user_b UUID)
RETURNS TABLE (
  is_blocked BOOLEAN,
  blocked_by_a BOOLEAN,
  blocked_by_b BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
         OR (blocker_id = p_user_b AND blocked_id = p_user_a)
    ),
    EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p_user_a AND blocked_id = p_user_b),
    EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p_user_b AND blocked_id = p_user_a);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: RPC - get_conversation_list（帶未讀數）
-- ============================================

CREATE OR REPLACE FUNCTION get_conversation_list(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
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
  is_blocked BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
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
    CASE WHEN c.user1_id = v_current_user_id THEN c.user2_id ELSE c.user1_id END AS other_user_id,
    p.name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    c.source_type,
    c.source_id,
    c.source_title,
    c.last_message_at,
    c.last_message_preview,
    -- 計算未讀數
    (
      SELECT COUNT(*)
      FROM messages m
      WHERE m.conversation_id = c.id
      AND m.sender_id != v_current_user_id
      AND m.created_at > CASE
        WHEN c.user1_id = v_current_user_id THEN COALESCE(c.user1_last_read_at, c.created_at)
        ELSE COALESCE(c.user2_last_read_at, c.created_at)
      END
    ) AS unread_count,
    -- 檢查是否被封鎖
    EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = v_current_user_id AND b.blocked_id = 
             CASE WHEN c.user1_id = v_current_user_id THEN c.user2_id ELSE c.user1_id END)
         OR (b.blocked_id = v_current_user_id AND b.blocker_id = 
             CASE WHEN c.user1_id = v_current_user_id THEN c.user2_id ELSE c.user1_id END)
    ) AS is_blocked,
    c.created_at
  FROM conversations c
  JOIN profiles p ON p.id = CASE WHEN c.user1_id = v_current_user_id THEN c.user2_id ELSE c.user1_id END
  WHERE (c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id)
  AND (
    p_search IS NULL
    OR p.name ILIKE '%' || p_search || '%'
    OR c.last_message_preview ILIKE '%' || p_search || '%'
  )
  ORDER BY c.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 9: RPC - get_messages（分頁載入訊息）
-- ============================================

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
) AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- 驗證權限
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation_id
    AND (c.user1_id = v_current_user_id OR c.user2_id = v_current_user_id)
  ) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    m.id,
    m.sender_id,
    p.name AS sender_name,
    p.avatar_url AS sender_avatar,
    m.content,
    m.client_message_id,
    m.status,
    m.created_at
  FROM messages m
  JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
  AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 10: RPC - mark_as_read（標記已讀）
-- ============================================

CREATE OR REPLACE FUNCTION mark_as_read(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  UPDATE conversations
  SET
    user1_last_read_at = CASE WHEN user1_id = v_current_user_id THEN NOW() ELSE user1_last_read_at END,
    user2_last_read_at = CASE WHEN user2_id = v_current_user_id THEN NOW() ELSE user2_last_read_at END
  WHERE id = p_conversation_id
  AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 11: RPC - send_message（發送訊息）
-- ============================================

CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_client_message_id TEXT
)
RETURNS TABLE (
  message_id UUID,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_current_user_id UUID;
  v_other_user_id UUID;
  v_is_blocked BOOLEAN;
  v_message_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- 獲取對方 ID
  SELECT CASE WHEN user1_id = v_current_user_id THEN user2_id ELSE user1_id END
  INTO v_other_user_id
  FROM conversations
  WHERE id = p_conversation_id
  AND (user1_id = v_current_user_id OR user2_id = v_current_user_id);
  
  IF v_other_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'NOT_PARTICIPANT', '您不是此對話的參與者';
    RETURN;
  END IF;
  
  -- 檢查封鎖
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = v_current_user_id AND blocked_id = v_other_user_id)
       OR (blocker_id = v_other_user_id AND blocked_id = v_current_user_id)
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN QUERY SELECT NULL::UUID, 'BLOCKED', '無法發送訊息（已封鎖）';
    RETURN;
  END IF;
  
  -- 插入訊息（使用 ON CONFLICT 處理重複）
  INSERT INTO messages (conversation_id, sender_id, content, client_message_id, status)
  VALUES (p_conversation_id, v_current_user_id, p_content, p_client_message_id, 'sent')
  ON CONFLICT (conversation_id, client_message_id) DO NOTHING
  RETURNING id INTO v_message_id;
  
  -- 如果是重複的，查詢已存在的
  IF v_message_id IS NULL THEN
    SELECT id INTO v_message_id
    FROM messages
    WHERE conversation_id = p_conversation_id AND client_message_id = p_client_message_id;
  END IF;
  
  RETURN QUERY SELECT v_message_id, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 12: RPC - block_user / unblock_user
-- ============================================

CREATE OR REPLACE FUNCTION block_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO blocks (blocker_id, blocked_id, reason)
  VALUES (auth.uid(), p_user_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unblock_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM blocks
  WHERE blocker_id = auth.uid() AND blocked_id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 13: RPC - report_user
-- ============================================

CREATE OR REPLACE FUNCTION report_user(
  p_user_id UUID,
  p_reason TEXT,
  p_description TEXT DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
BEGIN
  INSERT INTO reports (reporter_id, reported_id, reason, description, conversation_id)
  VALUES (auth.uid(), p_user_id, p_reason, p_description, p_conversation_id)
  RETURNING id INTO v_report_id;
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成
-- ============================================

SELECT '✅ 聊天系統 V2 Migration 完成！' AS status;













