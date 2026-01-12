-- ============================================
-- 🔧 修復第一則私訊 Email 通知消失問題
-- ============================================

-- 1. 在 conversations 表添加 first_message_email_sent_at 欄位（用於去重）
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS first_message_email_sent_at TIMESTAMPTZ;

-- 2. 在 messages 表添加 email_notified_at 欄位（用於判斷是否已發送 Email）
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS email_notified_at TIMESTAMPTZ;

-- 3. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_conversations_first_message_email_sent 
ON conversations(first_message_email_sent_at) 
WHERE first_message_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_email_notified_at 
ON messages(email_notified_at) 
WHERE email_notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_first_message_type 
ON messages(message_type, email_notified_at) 
WHERE message_type = 'FIRST_MESSAGE';

SELECT '✅ First message email notification fix applied' AS status;

