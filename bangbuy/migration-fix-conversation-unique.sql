-- ============================================
-- 🔐 修復聊天室唯一約束（防止重複創建）
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

SET search_path = public;

-- ============================================
-- Step 1: 確保必要欄位存在
-- ============================================

-- 添加 user_low_id, user_high_id 欄位（用於正規化 user pair）
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_low_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_high_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_key TEXT;

-- ============================================
-- Step 2: 回填現有資料
-- ============================================

-- 更新 user_low_id, user_high_id（使用 LEAST/GREATEST 確保順序一致）
UPDATE conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id)
WHERE user_low_id IS NULL OR user_high_id IS NULL;

-- 更新 source_key（組合 source_type 和 source_id）
UPDATE conversations
SET source_key = CASE
  WHEN source_id IS NULL THEN COALESCE(source_type, 'direct') || ':direct'
  ELSE COALESCE(source_type, 'direct') || ':' || source_id::text
END
WHERE source_key IS NULL;

-- ============================================
-- Step 3: 清理重複的對話（保留最新的）
-- ============================================

-- 識別並刪除重複對話（保留有最新訊息的那筆）
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LEAST(user1_id, user2_id),
        GREATEST(user1_id, user2_id),
        COALESCE(source_type, 'direct'),
        COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY 
        last_message_at DESC NULLS LAST,
        created_at DESC
    ) as rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY 
        LEAST(user1_id, user2_id),
        GREATEST(user1_id, user2_id),
        COALESCE(source_type, 'direct'),
        COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY 
        last_message_at DESC NULLS LAST,
        created_at DESC
    ) as keep_id
  FROM conversations
)
-- 先把被刪除的 conversation 的 messages 搬到保留的 conversation
UPDATE messages m
SET conversation_id = d.keep_id
FROM duplicates d
WHERE m.conversation_id = d.id
  AND d.rn > 1
  AND d.id != d.keep_id;

-- 刪除重複的 conversations
DELETE FROM conversations
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          LEAST(user1_id, user2_id),
          GREATEST(user1_id, user2_id),
          COALESCE(source_type, 'direct'),
          COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
        ORDER BY 
          last_message_at DESC NULLS LAST,
          created_at DESC
      ) as rn
    FROM conversations
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- Step 4: 再次確保欄位正確
-- ============================================

UPDATE conversations
SET 
  user_low_id = LEAST(user1_id, user2_id),
  user_high_id = GREATEST(user1_id, user2_id)
WHERE user_low_id IS NULL OR user_high_id IS NULL;

UPDATE conversations
SET source_key = CASE
  WHEN source_id IS NULL THEN COALESCE(source_type, 'direct') || ':direct'
  ELSE COALESCE(source_type, 'direct') || ':' || source_id::text
END
WHERE source_key IS NULL;

-- ============================================
-- Step 5: 創建唯一約束（防止重複）
-- ============================================

-- 刪除舊的唯一約束
DROP INDEX IF EXISTS idx_conversations_unique_pair;
DROP INDEX IF EXISTS idx_conversations_unique_pair_v2;
DROP INDEX IF EXISTS idx_conversations_stable_unique;

-- 創建新的唯一約束
CREATE UNIQUE INDEX idx_conversations_stable_unique
ON conversations (
  user_low_id, 
  user_high_id, 
  COALESCE(source_type, 'direct'),
  COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- 創建索引加速查詢
CREATE INDEX IF NOT EXISTS idx_conversations_user_low_high 
ON conversations(user_low_id, user_high_id);

CREATE INDEX IF NOT EXISTS idx_conversations_source_key 
ON conversations(source_key);

-- ============================================
-- Step 6: 更新 get_or_create_conversation RPC
-- ============================================

DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_target UUID,
  p_source_type TEXT DEFAULT 'direct',
  p_source_id UUID DEFAULT NULL,
  p_source_title TEXT DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  is_new BOOLEAN
) AS $$
DECLARE
  v_my_id UUID := auth.uid();
  v_low_id UUID;
  v_high_id UUID;
  v_conv_id UUID;
  v_source_type TEXT;
  v_source_key TEXT;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- 驗證
  IF v_my_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_target IS NULL OR p_target = v_my_id THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  
  -- 計算穩定的 user pair（確保順序一致）
  v_low_id := LEAST(v_my_id, p_target);
  v_high_id := GREATEST(v_my_id, p_target);
  
  -- 正規化 source_type
  v_source_type := COALESCE(NULLIF(p_source_type, ''), 'direct');
  v_source_key := CASE 
    WHEN p_source_id IS NULL THEN v_source_type || ':direct'
    ELSE v_source_type || ':' || p_source_id::TEXT
  END;
  
  -- 嘗試查找現有對話（使用正規化的 key）
  SELECT id INTO v_conv_id
  FROM conversations
  WHERE user_low_id = v_low_id
    AND user_high_id = v_high_id
    AND COALESCE(source_type, 'direct') = v_source_type
    AND COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;
  
  IF v_conv_id IS NOT NULL THEN
    -- 找到現有對話
    RETURN QUERY SELECT v_conv_id, FALSE;
    RETURN;
  END IF;
  
  -- 建立新對話（使用 ON CONFLICT 確保冪等性）
  INSERT INTO conversations (
    user1_id,
    user2_id,
    user_low_id,
    user_high_id,
    source_type,
    source_id,
    source_title,
    source_key,
    last_message_at
  ) VALUES (
    v_my_id,
    p_target,
    v_low_id,
    v_high_id,
    v_source_type,
    p_source_id,
    p_source_title,
    v_source_key,
    NOW()
  )
  ON CONFLICT (user_low_id, user_high_id, COALESCE(source_type, 'direct'), COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_conv_id;
  
  RETURN QUERY SELECT v_conv_id, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ============================================
-- 完成確認
-- ============================================

SELECT '✅ 唯一約束已建立' AS status;
SELECT '✅ get_or_create_conversation RPC 已更新' AS status;
SELECT '✅ 重複對話已清理' AS status;


