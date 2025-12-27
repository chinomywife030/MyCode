-- ============================================
-- 🔧 修復第一則私訊 Email 通知消失問題
-- ============================================

-- 1. 在 conversations 表添加 first_message_email_sent_at 欄位（用於去重）
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS first_message_email_sent_at TIMESTAMPTZ;

-- 2. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_conversations_first_message_email_sent 
ON conversations(first_message_email_sent_at) 
WHERE first_message_email_sent_at IS NOT NULL;

SELECT '✅ First message email notification fix applied' AS status;

