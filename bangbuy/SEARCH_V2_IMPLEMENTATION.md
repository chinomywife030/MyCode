# 🔍 搜尋功能 V2 實作總結

## 更新日期
2025-12-16

## 實作目標
- 支援中文關鍵字切分、模糊比對、欄位權重（標題 > 目的地 > 描述）
- 新增可收合 Filter（手機 Bottom Sheet / 桌機 Popover）
- URL 同步、空狀態建議

---

## 📁 新增 / 修改檔案

### 1. `lib/search/searchUtils.ts`（新增）
核心搜尋演算法：

#### 欄位權重
```typescript
const FIELD_WEIGHTS = {
  title: 3.0,        // 標題
  destination: 2.0,  // 目的地
  category: 1.5,     // 分類/標籤
  tags: 1.5,
  description: 1.0,  // 描述
};
```

#### Tokenize 函數
- **英文**：空白切分，過濾長度 1 的 token
- **中文**：2-gram 切分（例如「東京代購」→ [東京, 京代, 代購]）

#### 計分策略
每個 token 對欄位的三段式計分：
- **Exact 包含**：+1.0
- **Prefix 匹配**：+0.8
- **Fuzzy（Levenshtein）**：+0.5（僅對長度 ≥4 英文或 ≥2 中文啟用）

#### 高亮函數
- `highlightText(text, tokens)` 返回帶 `<mark>` 標籤的 HTML

---

### 2. `components/search/FilterButton.tsx`（新增）
篩選按鈕：
- 顯示 active filters 數量 badge
- 支援 `forwardRef` 用於 Popover 定位

---

### 3. `components/search/FilterPanel.tsx`（新增）
篩選面板內容（共用於手機/桌機）：

#### Filter 欄位
| 欄位 | 類型 |
|------|------|
| 目的地 | Quick chips (🇯🇵/🇰🇷/🇺🇸/🇬🇧/🇩🇪) + 自訂輸入 |
| 分類 | Chips (全部/食品/美妝/服飾/3C/其他) |
| 價格區間 | min/max 數字輸入 |
| 狀態 | Chips (全部/待處理/進行中/已完成) |
| 排序 | 下拉選單 (最相關/最新/價格低→高/高→低) |

---

### 4. `components/search/FilterSheet.tsx`（新增）
響應式篩選面板：
- **手機** (≤768px)：Bottom Sheet + backdrop
- **桌機** (>768px)：Popover，根據 anchorRef 定位

---

### 5. `hooks/useSearch.ts`（升級）
擴充搜尋狀態：

```typescript
type SearchState = {
  q: string;
  destination?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
};
```

新增輸出：
- `hasQuery`：是否有搜尋詞
- `filterValues`：用於 FilterPanel
- `searchOptions`：用於 searchItems
- `setFilters()`：批次更新 filter

---

### 6. `components/search/SearchEmptyState.tsx`（升級）
更聰明的空狀態：
- 顯示建議（更短關鍵字、移除篩選條件）
- 分離 `onClearQuery`、`onClearFilters`、`onClearAll`

---

### 7. `app/page.tsx`（修改）
整合搜尋 V2：
- 使用 `buildSearchIndex` + `searchItems` 進行前端搜尋
- 新增 FilterButton + FilterSheet
- 顯示 Active Filters 快速標籤

---

## 🎯 驗收標準

| 項目 | 狀態 |
|------|------|
| 搜尋「東京」「tokyo」「toky」都能命中 | ✅ |
| 中文連續字串也能命中（2-gram） | ✅ |
| Filter 在手機不佔版面 | ✅ |
| 有 q 時排序以 relevance 為主 | ✅ |
| 列表 100 筆不卡頓（useMemo） | ✅ |
| URL 同步（refresh 不丟狀態） | ✅ |

---

## 🔧 效能優化

1. **搜尋索引 memoize**
   ```typescript
   const tripsIndex = useMemo(() => buildSearchIndex(trips), [trips]);
   ```

2. **搜尋結果 memoize**
   ```typescript
   const tripsResults = useMemo(() => 
     searchItems(tripsIndex, searchOptions), 
     [tripsIndex, searchOptions]
   );
   ```

3. **Fuzzy 限制**
   - 僅對長度 ≥4 英文或 ≥2 中文啟用
   - Levenshtein 限制字串長度 ≤20

---

## 📱 UI/UX

### Filter 按鈕
- 顯示篩選數量 badge
- 顏色跟隨身份（藍/橘）

### Bottom Sheet（手機）
- 上滑動畫
- 拖曳把手
- 「完成」按鈕關閉

### Popover（桌機）
- 縮放動畫
- 點擊外部關閉
- ESC 關閉

### Active Filters 標籤
- 快速顯示目前篩選條件
- 可單獨移除或「清除全部」




