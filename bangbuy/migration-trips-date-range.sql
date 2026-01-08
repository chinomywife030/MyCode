-- ============================================
-- Trips 日期區間 Migration
-- 在 Supabase SQL Editor 執行
-- ============================================

-- 1. 新增 start_date 和 end_date 欄位
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. 將舊資料的 date 欄位遷移到 start_date 和 end_date（向下相容）
UPDATE trips
SET 
  start_date = date,
  end_date = date
WHERE start_date IS NULL OR end_date IS NULL;

-- 3. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_end_date ON trips(end_date);

-- 4. 驗證
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trips' 
  AND column_name IN ('date', 'start_date', 'end_date');

SELECT 'Trips date range migration completed!' AS status;
















