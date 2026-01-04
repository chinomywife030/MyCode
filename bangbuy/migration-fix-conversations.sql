-- ============================================
-- 🔐 修復聊天室重複創建問題
-- 在 Supabase SQL Editor 中執行此腳本
-- ============================================

-- 1. 新增 source_key 欄位（避免 NULL 造成 UNIQUE 失效）
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS source_key TEXT;

-- 2. 為現有資料填充 source_key
UPDATE conversations
SET source_key = CASE
  WHEN source_type = 'direct' THEN 'direct'
  WHEN source_type = 'legacy' THEN 'legacy'
  WHEN source_id IS NOT NULL THEN source_id::text
  ELSE COALESCE(source_type, 'unknown')
END
WHERE source_key IS NULL;

-- 3. 設定 source_key 為 NOT NULL（先確保所有資料都有值）
-- ALTER TABLE conversations ALTER COLUMN source_key SET NOT NULL;
-- 注意：如果有問題，先跳過這步

-- 4. 正規化現有的 user pair（確保 user1_id < user2_id）
-- 這會交換 user1_id 和 user2_id 使較小的 UUID 在 user1_id
UPDATE conversations
SET 
  user1_id = CASE WHEN user1_id > user2_id THEN user2_id ELSE user1_id END,
  user2_id = CASE WHEN user1_id > user2_id THEN user1_id ELSE user2_id END
WHERE user1_id > user2_id;

-- 5. 刪除重複的對話（保留最早的那筆）
-- 先創建一個臨時表來標記要刪除的重複項
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LEAST(user1_id, user2_id), 
        GREATEST(user1_id, user2_id), 
        source_type, 
        COALESCE(source_key, source_id::text, source_type)
      ORDER BY created_at ASC
    ) as rn
  FROM conversations
)
DELETE FROM conversations
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 6. 刪除舊的唯一約束（如果存在）
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_user1_id_user2_id_source_type_source_id_key;

-- 7. 創建新的唯一約束（使用 source_key）
-- 使用 COALESCE 確保 NULL 被處理
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
ON conversations (
  LEAST(user1_id, user2_id),
  GREATEST(user1_id, user2_id),
  source_type,
  COALESCE(source_key, 'default')
);

-- 8. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_conversations_source_key ON conversations(source_key);

-- 9. 驗證結果
SELECT 
  'Conversations count: ' || COUNT(*) as info
FROM conversations;

SELECT 
  'Duplicates check: ' || COUNT(*) as duplicates
FROM (
  SELECT 
    LEAST(user1_id, user2_id) as u1,
    GREATEST(user1_id, user2_id) as u2,
    source_type,
    COALESCE(source_key, 'default') as sk,
    COUNT(*) as cnt
  FROM conversations
  GROUP BY u1, u2, source_type, sk
  HAVING COUNT(*) > 1
) t;

SELECT '✅ 聊天室重複問題修復完成！' AS status;
























