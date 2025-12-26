# Trips 日期區間功能 - 錯誤修正

## 錯誤訊息

```
Could not find the 'end_date' column of 'trips' in the schema cache
```

## 原因

資料庫 migration 尚未執行，`trips` 表還沒有 `start_date` 和 `end_date` 欄位。

## 解決方案

### 步驟 1：執行 SQL Migration

在 Supabase Dashboard → SQL Editor 執行以下 SQL：

```sql
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
```

### 步驟 2：驗證 Migration 成功

執行驗證查詢後，應該看到：
- `date` (DATE)
- `start_date` (DATE)
- `end_date` (DATE)

### 步驟 3：重新測試

1. 前往 `/trips/create`
2. 填寫表單並提交
3. 確認不再出現錯誤

## 注意事項

- Migration 檔案位置：`bangbuy/migration-trips-date-range.sql`
- 如果 migration 執行失敗，請檢查錯誤訊息
- 舊資料會自動遷移（`date` → `start_date` 和 `end_date`）




## 錯誤訊息

```
Could not find the 'end_date' column of 'trips' in the schema cache
```

## 原因

資料庫 migration 尚未執行，`trips` 表還沒有 `start_date` 和 `end_date` 欄位。

## 解決方案

### 步驟 1：執行 SQL Migration

在 Supabase Dashboard → SQL Editor 執行以下 SQL：

```sql
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
```

### 步驟 2：驗證 Migration 成功

執行驗證查詢後，應該看到：
- `date` (DATE)
- `start_date` (DATE)
- `end_date` (DATE)

### 步驟 3：重新測試

1. 前往 `/trips/create`
2. 填寫表單並提交
3. 確認不再出現錯誤

## 注意事項

- Migration 檔案位置：`bangbuy/migration-trips-date-range.sql`
- 如果 migration 執行失敗，請檢查錯誤訊息
- 舊資料會自動遷移（`date` → `start_date` 和 `end_date`）









