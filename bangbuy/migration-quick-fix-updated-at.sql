-- ============================================
-- 🚀 快速修復：為 wish_requests 添加 updated_at 欄位
-- ============================================

-- 1. 添加欄位
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. 回填現有資料
UPDATE wish_requests SET updated_at = created_at WHERE updated_at IS NULL;

-- 3. 確認修復成功
SELECT 'updated_at 欄位已添加' AS status, count(*) AS wish_count FROM wish_requests;













