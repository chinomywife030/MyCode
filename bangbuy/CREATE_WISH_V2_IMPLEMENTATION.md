# 📝 許願單創建頁面 V2 實作總結

## 更新日期
2025-12-17

---

## 📁 新增 / 修改檔案

| 檔案 | 說明 |
|------|------|
| `components/form/CountrySelect.tsx` | 可搜尋國家選擇器 |
| `components/form/MultiImageUpload.tsx` | 多圖上傳組件 |
| `components/form/CategorySelect.tsx` | 分類選擇器 |
| `components/form/index.ts` | 表單組件導出 |
| `hooks/useWishDraft.ts` | 草稿自動保存 Hook |
| `app/create/page.tsx` | 許願單創建頁面（完整重寫）|

---

## 🌍 國家選擇器功能

### 特點
- **可搜尋**：支援中文、英文、國碼搜尋
- **熱門置頂**：JP/KR/US/DE/UK/FR 置頂顯示
- **記住選擇**：localStorage 記住上次選擇
- **鍵盤導航**：支援 ↑↓ Enter ESC

### 國家列表（40+ 個）
- 🔥 熱門：日本、韓國、美國、德國、英國、法國
- 🌍 歐洲：義大利、西班牙、荷蘭、比利時、瑞士...
- 🌏 亞洲：台灣、香港、澳門、新加坡、泰國...
- 🌎 其他：加拿大、澳洲、紐西蘭、阿聯酋...

---

## 📷 多圖上傳功能

### 規格
| 項目 | 值 |
|------|-----|
| 最大張數 | 6 張 |
| 單張大小 | 5MB |
| 支援格式 | JPG/PNG/WEBP |

### 功能
- ✅ 一次選多張（multiple）
- ✅ 即時預覽
- ✅ 上傳進度顯示
- ✅ 刪除單張
- ✅ 拖曳排序（桌機）
- ✅ 序號顯示

---

## 📋 新增欄位

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `qty` | number | ✅ | 數量（預設 1）|
| `spec` | string | | 顏色/尺寸/型號 |
| `budget_max` | number | | 預算上限 |
| `allow_substitute` | boolean | | 可接受替代品 |
| `tags` | string[] | | 關鍵字標籤 |

### 預估總價計算
```
預估總價 = 單價 × 數量 + 代購費
```

### 驗證規則
- 商品名稱必填
- 單價必須 > 0
- 數量必須 > 0
- 截止日期不能是過去
- 預算上限 < 預估總價 → 警告（不阻止）

---

## 💾 草稿保存

### 機制
- **自動保存**：輸入後 500ms debounce
- **持久化**：localStorage `bangbuy_wish_draft_v2`
- **過期清除**：7 天後自動清除
- **提交清除**：成功提交後清除

### 保存欄位
```typescript
interface WishDraft {
  title: string;
  description: string;
  target_country: string;
  category: string;
  price: number | '';
  commission: number | '';
  budget_max: number | '';
  qty: number;
  spec: string;
  product_url: string;
  deadline: string;
  is_urgent: boolean;
  allow_substitute: boolean;
  image_urls: string[];
  tags: string;
  _savedAt?: number;
}
```

---

## 🎉 提交後導流

成功提交後顯示：
1. ✅ 成功頁面（🎉 圖示）
2. **查看許願單** → `/wish/{id}`
3. **分享連結** → 複製到剪貼簿
4. **前往聊天室** → `/chat`
5. **返回首頁** → `/`

---

## 📦 分類選項

| 值 | 標籤 | Emoji |
|----|------|-------|
| `toy` | 玩具/公仔 | 🧸 |
| `luxury` | 精品 | 👜 |
| `digital` | 3C 電子 | 📱 |
| `clothes` | 服飾 | 👕 |
| `beauty` | 美妝 | 💄 |
| `food` | 零食/食品 | 🍜 |
| `medicine` | 藥妝 | 💊 |
| `sports` | 運動用品 | ⚽ |
| `home` | 居家用品 | 🏠 |
| `other` | 其他 | 📦 |

---

## 🗄️ 資料庫欄位（建議新增）

如果需要完整支援新欄位，建議在 `wish_requests` 表新增：

```sql
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS qty integer DEFAULT 1;
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS spec text;
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS budget_max integer;
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS allow_substitute boolean DEFAULT true;
ALTER TABLE wish_requests ADD COLUMN IF NOT EXISTS tags text[];
```

---

## 🧪 驗收測試

| 測試項目 | 預期結果 |
|----------|----------|
| 國家搜尋「日本」| 顯示 🇯🇵 日本 JP |
| 國家搜尋「JP」| 顯示 🇯🇵 日本 JP |
| 上傳 7 張圖 | 只選取前 6 張 |
| 上傳 6MB 圖 | 顯示大小限制警告 |
| 數量輸入 0 | 顯示錯誤提示 |
| 截止日期選昨天 | 顯示錯誤提示 |
| 預算低於總價 | 顯示黃色警告 |
| 刷新頁面 | 草稿自動恢復 |
| 提交成功 | 顯示成功頁 + 分享按鈕 |















