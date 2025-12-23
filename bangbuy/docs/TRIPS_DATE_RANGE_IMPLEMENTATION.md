# Trips 日期區間功能實作說明

## 概述

將 `/trips/create` 頁面的單一日期欄位改為日期區間（開始日期 + 結束日期），並更新所有相關的顯示和查詢邏輯。

## 修改檔案清單

### 1. 資料庫 Migration
- `bangbuy/migration-trips-date-range.sql`（新建）
  - 新增 `start_date` 和 `end_date` 欄位
  - 將舊資料的 `date` 遷移到新欄位
  - 建立索引

### 2. 工具函數
- `bangbuy/lib/dateFormat.ts`（新建）
  - `formatDateRange()`: 格式化日期區間顯示
  - `isDateInRange()`: 檢查日期是否在區間內

### 3. 前端頁面
- `bangbuy/app/trips/create/page.tsx`（修改）
  - 表單改為兩個日期選擇器（開始日期 + 結束日期）
  - 新增日期驗證邏輯
  - 更新提交 payload

- `bangbuy/app/trips/page.tsx`（修改）
  - 更新查詢邏輯支援日期區間
  - 更新卡片顯示使用 `formatDateRange()`

- `bangbuy/app/page.tsx`（修改）
  - 更新首頁 trips 卡片顯示
  - 更新日期篩選邏輯

- `bangbuy/app/dashboard/trips/page.tsx`（修改）
  - 更新「我的行程」顯示

### 4. 類型定義
- `bangbuy/types/index.ts`（修改）
  - 更新 `Trip` interface，新增 `start_date` 和 `end_date`

## SQL Migration

```sql
-- 新增 start_date 和 end_date 欄位
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- 將舊資料的 date 欄位遷移到 start_date 和 end_date（向下相容）
UPDATE trips
SET 
  start_date = date,
  end_date = date
WHERE start_date IS NULL OR end_date IS NULL;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_end_date ON trips(end_date);
```

## 前端表單改動

### 原本（單一日期）
```tsx
<input
  name="date"
  type="date"
  required
/>
```

### 現在（日期區間）
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label>開始日期</label>
    <input
      name="start_date"
      type="date"
      required
      placeholder="yyyy/mm/dd"
    />
  </div>
  <div>
    <label>結束日期</label>
    <input
      name="end_date"
      type="date"
      required
      placeholder="yyyy/mm/dd"
      min={formData.start_date || undefined}
    />
  </div>
</div>
```

## 提交 Payload

### 原本
```json
{
  "destination": "日本東京",
  "date": "2024-12-25",
  "description": "..."
}
```

### 現在
```json
{
  "destination": "日本東京",
  "start_date": "2024-12-25",
  "end_date": "2024-12-30",
  "date": "2024-12-25",  // 向下相容：保留 date 欄位
  "description": "..."
}
```

## 日期顯示格式

### 使用 `formatDateRange()` 函數

```typescript
import { formatDateRange } from '@/lib/dateFormat';

// 顯示日期
formatDateRange(trip.start_date, trip.end_date, trip.date)
```

### 顯示規則
- **單日行程**（start_date === end_date）：`2024/12/25`
- **日期區間**：`2024/12/25 - 2024/12/30`
- **舊資料**（只有 date）：`2024/12/25`（自動向下相容）
- **無日期**：`日期未定`

## 查詢邏輯更新

### 列表查詢（只顯示今天以後的行程）

```typescript
const today = new Date().toISOString().split('T')[0];
q = q.or(`start_date.gte.${today},end_date.gte.${today},date.gte.${today}`)
  .order('start_date', { ascending: true, nullsFirst: false })
  .order('date', { ascending: true, nullsFirst: false });
```

### 日期篩選

```typescript
// 查詢開始日期：行程結束日期 >= 查詢開始日期
if (params.dateFrom) {
  q = q.or(`end_date.gte.${params.dateFrom},date.gte.${params.dateFrom}`);
}

// 查詢結束日期：行程開始日期 <= 查詢結束日期
if (params.dateTo) {
  q = q.or(`start_date.lte.${params.dateTo},date.lte.${params.dateTo}`);
}
```

## 驗證邏輯

```typescript
// 必填驗證
if (!formData.start_date) {
  setDateError('請選擇開始日期');
  return;
}
if (!formData.end_date) {
  setDateError('請選擇結束日期');
  return;
}

// 日期順序驗證
if (new Date(formData.end_date) < new Date(formData.start_date)) {
  setDateError('結束日期不得早於開始日期');
  return;
}
```

## 向下相容

所有顯示和查詢邏輯都支援向下相容：
- 如果 `start_date` 和 `end_date` 存在，使用它們
- 如果不存在，使用舊的 `date` 欄位
- 舊資料會自動在 migration 時遷移

## 部署步驟

1. **執行 SQL Migration**
   ```sql
   -- 在 Supabase SQL Editor 執行 migration-trips-date-range.sql
   ```

2. **驗證資料遷移**
   ```sql
   SELECT id, destination, date, start_date, end_date 
   FROM trips 
   LIMIT 10;
   ```

3. **測試功能**
   - 前往 `/trips/create` 發布新行程
   - 確認日期區間顯示正確
   - 確認列表和卡片顯示正確

## 注意事項

- `date` 欄位保留以向下相容，但新資料會同時寫入 `start_date` 和 `end_date`
- 所有查詢都使用 `or` 條件同時支援新舊欄位
- 顯示邏輯統一使用 `formatDateRange()` 函數




