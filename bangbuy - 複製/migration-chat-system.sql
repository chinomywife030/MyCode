-- ============================================
-- 🔐 BangBuy 聊天系統完整 Schema
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 1. 建立 conversations 資料表（聊天室）
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 🔐 來源上下文（P0-2：所有聊天室必須綁定來源）
  source_type TEXT CHECK (source_type IN ('wish_request', 'trip', 'listing', 'legacy', 'direct')),
  source_id UUID, -- 對應來源的主鍵
  source_title TEXT, -- 緩存來源標題（避免每次查詢）
  source_key TEXT NOT NULL DEFAULT 'direct', -- 🔐 避免 NULL 造成 UNIQUE 失效
  
  -- 🔐 P1-7：已讀/未讀（聊天室層級）
  user1_last_read_at TIMESTAMPTZ, -- user1 最後讀取時間
  user2_last_read_at TIMESTAMPTZ, -- user2 最後讀取時間
  
  -- 時間戳記
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔐 唯一約束：使用正規化的 user pair + source_key（防止重複創建）
-- 注意：user1_id 必須 < user2_id（在應用層保證）
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
ON conversations (
  LEAST(user1_id, user2_id),
  GREATEST(user1_id, user2_id),
  source_type,
  source_key
);

-- 2. 建立 messages 資料表（訊息）
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  
  -- 🔐 P1-5：訊息去重（client_message_id）
  client_message_id TEXT, -- 前端生成的唯一 ID
  
  -- 訊息狀態
  is_read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 🔐 確保同一聊天室同一 client_message_id 唯一（防止重複）
  UNIQUE(conversation_id, client_message_id)
);

-- 3. 建立 blocks 資料表（封鎖）
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保不能重複封鎖
  UNIQUE(blocker_id, blocked_id)
);

-- 4. 建立 reports 資料表（檢舉，P2-9）
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  
  -- 檢舉原因
  reason TEXT NOT NULL CHECK (reason IN ('scam', 'harassment', 'fake_goods', 'personal_info', 'other')),
  description TEXT,
  
  -- 處理狀態
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 建立 rate_limits 資料表（速率限制，P2-10）
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('message', 'new_conversation')),
  
  -- 計數
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  
  -- 每個用戶每種行為只有一條記錄
  UNIQUE(user_id, action_type)
);

-- ============================================
-- 建立索引以提升查詢效能
-- ============================================

-- conversations 索引
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source_type, source_id);

-- messages 索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_message_id);

-- blocks 索引
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- reports 索引
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- rate_limits 索引
CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON rate_limits(user_id);

-- ============================================
-- 啟用 Row Level Security (RLS)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- conversations RLS 政策
-- ============================================

-- 只能看到自己參與的對話
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 只能創建自己參與的對話
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 只能更新自己參與的對話
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- messages RLS 政策（🔐 P0-4：封鎖硬阻擋）
-- ============================================

-- 只能看到自己參與的對話中的訊息
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 🔐 只能在自己參與且未被封鎖的對話中發送訊息
DROP POLICY IF EXISTS "Users can send messages if not blocked" ON messages;
CREATE POLICY "Users can send messages if not blocked"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    -- 🔐 封鎖檢查：確保對方沒有封鎖我
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE b.blocked_id = auth.uid()
      AND b.blocker_id = (
        SELECT CASE 
          WHEN c.user1_id = auth.uid() THEN c.user2_id 
          ELSE c.user1_id 
        END
        FROM conversations c
        WHERE c.id = conversation_id
      )
    )
    -- 🔐 封鎖檢查：確保我沒有封鎖對方（雙向）
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE b.blocker_id = auth.uid()
      AND b.blocked_id = (
        SELECT CASE 
          WHEN c.user1_id = auth.uid() THEN c.user2_id 
          ELSE c.user1_id 
        END
        FROM conversations c
        WHERE c.id = conversation_id
      )
    )
  );

-- ============================================
-- blocks RLS 政策
-- ============================================

-- 只能看到自己的封鎖記錄
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);

-- 只能創建自己作為封鎖者的記錄
DROP POLICY IF EXISTS "Users can create blocks" ON blocks;
CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- 只能刪除自己的封鎖
DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;
CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ============================================
-- reports RLS 政策
-- ============================================

-- 只能看到自己提交的檢舉
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 只能創建自己作為檢舉者的記錄
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- rate_limits RLS 政策
-- ============================================

-- 只能看到和操作自己的速率限制記錄
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own rate limits" ON rate_limits;
CREATE POLICY "Users can upsert own rate limits"
  ON rate_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rate limits" ON rate_limits;
CREATE POLICY "Users can update own rate limits"
  ON rate_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 🔐 檢查函數：是否可以開新聊天（P0-3：新帳限制）
-- ============================================

CREATE OR REPLACE FUNCTION can_start_new_conversation(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_created_at TIMESTAMPTZ;
  hours_since_registration NUMERIC;
BEGIN
  -- 獲取用戶註冊時間
  SELECT created_at INTO user_created_at
  FROM profiles
  WHERE id = user_uuid;
  
  -- 計算註冊後的小時數
  hours_since_registration := EXTRACT(EPOCH FROM (NOW() - user_created_at)) / 3600;
  
  -- 如果註冊不到 24 小時，不能主動開新聊天
  IF hours_since_registration < 24 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 🔐 檢查函數：是否被封鎖
-- ============================================

CREATE OR REPLACE FUNCTION is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 🔐 檢查函數：速率限制（P2-10）
-- ============================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  user_uuid UUID,
  action TEXT,
  max_count INTEGER,
  window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
BEGIN
  -- 獲取當前窗口的計數
  SELECT count, window_start INTO current_count, window_start_time
  FROM rate_limits
  WHERE user_id = user_uuid AND action_type = action;
  
  -- 如果沒有記錄或窗口已過期，重置
  IF current_count IS NULL OR window_start_time < NOW() - (window_minutes || ' minutes')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, action_type, count, window_start)
    VALUES (user_uuid, action, 1, NOW())
    ON CONFLICT (user_id, action_type)
    DO UPDATE SET count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;
  
  -- 檢查是否超過限制
  IF current_count >= max_count THEN
    RETURN FALSE;
  END IF;
  
  -- 增加計數
  UPDATE rate_limits
  SET count = count + 1
  WHERE user_id = user_uuid AND action_type = action;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 觸發器：自動更新 conversations.updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 觸發器：新訊息時更新 conversation.last_message_at
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_message ON messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- 啟用 Realtime（用於即時訊息）
-- ============================================

-- 注意：在 Supabase Dashboard 中需要手動啟用以下表的 Realtime：
-- 1. conversations
-- 2. messages
-- 可以在 Database > Replication 中設定

-- ============================================
-- 遷移現有資料（如果已有 conversations/messages 表）
-- ============================================

-- 為現有聊天室設定 source_type = 'legacy'
UPDATE conversations
SET source_type = 'legacy'
WHERE source_type IS NULL;

-- ============================================
-- 完成！
-- ============================================

SELECT '✅ 聊天系統 Schema 建立完成！' AS status;
SELECT '📝 請在 Supabase Dashboard > Database > Replication 啟用 conversations 和 messages 的 Realtime' AS next_step;

