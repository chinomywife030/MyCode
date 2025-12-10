# 🚀 Supabase 配額優化指南

## 📊 問題診斷

你的 Supabase 使用 **Free Plan**，有以下限制：
- ✅ 500 MB 數據庫空間
- ✅ 1 GB 文件儲存
- ⚠️ 2 GB 帶寬/月
- ⚠️ 50,000 API 請求/月

**「有時候有有時候沒有」的原因很可能是 API 請求配額不足！**

---

## ✅ 已實施的優化

### 1. **客戶端快取機制** ✅
- 2 分鐘內重複訪問首頁不會重新請求 API
- 大幅減少 API 請求次數
- 預估節省：**60-80% API 請求**

```typescript
// 快取有效期：2 分鐘
const CACHE_DURATION = 2 * 60 * 1000;
```

### 2. **自動重試機制** ✅
- 失敗自動重試 3 次
- 避免因暫時性錯誤而顯示空白頁

### 3. **輕量級健康檢查** ✅
- 使用 `head: true` 只檢查連接，不傳輸資料
- 減少帶寬使用

---

## 🔧 進一步優化建議

### 優化 1：減少查詢頻率

**當前問題：**
- 每次刷新頁面都會查詢資料庫
- 用戶頻繁切換頁面會耗盡配額

**解決方案：**
- ✅ 已實施 2 分鐘快取
- 建議延長到 5-10 分鐘（如果資料更新不頻繁）

### 優化 2：使用 Realtime Subscriptions（進階）

**好處：**
- 只訂閱一次，資料自動更新
- 減少重複的 API 請求

**實施：**
```typescript
// 訂閱許願單更新
const subscription = supabase
  .channel('public:wish_requests')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'wish_requests' }, payload => {
    console.log('資料更新:', payload);
    // 更新 state
  })
  .subscribe();
```

### 優化 3：添加分頁（重要！）

**當前問題：**
- 一次載入所有許願單和行程
- 資料量大時浪費帶寬

**解決方案：**
```typescript
// 只載入前 20 筆
.select('*')
.eq('status', 'open')
.order('created_at', { ascending: false })
.limit(20)  // 👈 添加這行
```

### 優化 4：只查詢需要的欄位

**當前：**
```typescript
.select('*')  // 查詢所有欄位
```

**優化後：**
```typescript
.select('id, title, budget, target_country, images, created_at, buyer_id')
```

預估節省：**30-40% 帶寬**

---

## 📈 監控配額使用

### 在 Supabase Dashboard 查看：

1. **Settings → Billing**
   - 查看當前配額使用百分比

2. **Reports → API**
   - 查看 API 請求趨勢
   - 找出最耗配額的 API

3. **Database → Backups**
   - 查看資料庫大小

---

## 🆘 如果配額還是不夠

### 方案 A：升級到 Pro Plan ($25/月)
- 8 GB 數據庫
- 250 GB 帶寬
- 500,000 API 請求/月

### 方案 B：優化資料結構
- 刪除舊的測試資料
- 壓縮圖片（如果有儲存）
- 定期清理過期的許願單

### 方案 C：使用 Server-Side Rendering (SSR)
- 將資料查詢移到伺服器端
- 減少客戶端 API 請求
- Next.js App Router 支援

```typescript
// app/page.tsx 改成 Server Component
export default async function Home() {
  const { data: wishes } = await supabase.from('wish_requests').select('*');
  return <div>...</div>;
}
```

---

## 🎯 立即執行的優化步驟

1. ✅ **已完成：添加客戶端快取**
2. ⏳ **建議：添加分頁功能**
3. ⏳ **建議：只查詢需要的欄位**
4. ⏳ **建議：刪除測試資料**

---

## 📊 預估效果

| 優化項目 | 節省比例 | 難度 |
|---------|---------|------|
| 客戶端快取 (2分鐘) | 60-80% | ✅ 簡單 |
| 分頁 (每頁20筆) | 40-60% | 🟡 中等 |
| 精簡欄位查詢 | 30-40% | ✅ 簡單 |
| Realtime 訂閱 | 70-90% | 🔴 進階 |

---

## 💡 測試優化效果

刷新頁面 5 次，檢查控制台：

```
第 1 次：🚀 開始載入資料...
第 2 次：💾 使用快取資料（節省 API 請求）✅
第 3 次：💾 使用快取資料（節省 API 請求）✅
第 4 次：💾 使用快取資料（節省 API 請求）✅
第 5 次：💾 使用快取資料（節省 API 請求）✅
```

**節省了 80% 的 API 請求！** 🎉

---

**需要我幫你實施分頁或其他優化嗎？** 📝

