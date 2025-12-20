# 🌟 Uber 式雙向評價系統 UI

## 📋 概述

這是一個完整的 **Uber 式雙向評價系統 UI**，完全使用**前端假資料**和 **local state** 實作，不涉及任何後端邏輯、Supabase、或資料抓取。

### ✅ 核心特色（Uber 式）

1. ✅ **雙向評價機制**：買家和代購者互相評價
2. ✅ **評價狀態追蹤**：我是否已評價、對方是否已評價
3. ✅ **視覺化狀態**：已評價顯示 ✓、未評價顯示按鈕
4. ✅ **即時 UI 更新**：送出評價後按鈕立即變成「已評價」
5. ✅ **評分展示**：個人頁面顯示平均評分和評價列表
6. ✅ **評分 Badge**：卡片上顯示使用者評分

---

## 📁 新增檔案

### 1. **`bangbuy/components/UberStyleReviewSection.tsx`** ⭐

**Uber 式評價區塊 Component**

這是核心 Component，實作 Uber 式的雙向評價 UI。

#### **功能：**

1. **評價狀態管理（假資料）**
```typescript
interface OrderReviewStatus {
  orderId: string;
  canCurrentUserReview: boolean;      // 是否可以評價
  hasCurrentUserReviewed: boolean;    // 我是否已評價
  hasOtherSideReviewed: boolean;      // 對方是否已評價我
  otherSideName: string;               // 對方名稱
  otherSideType: 'buyer' | 'shopper'; // 對方類型
}
```

2. **主按鈕狀態**
   - **未評價**：顯示橘色「評價 {對方名稱}」按鈕
   - **已評價**：顯示灰色「已評價 ✓」按鈕（disabled）

3. **對方評價狀態提示**
   - **對方已評價**：✅ 綠色勾勾 + 「{對方} 已對你做出評價」
   - **對方未評價**：⭕ 灰色圖示 + 「{對方} 尚未評價你」

4. **評價送出後行為**
   - console.log 評價資料
   - 更新 local state（`hasCurrentUserReviewed = true`）
   - 按鈕變成「已評價 ✓」

#### **使用範例：**

```tsx
<UberStyleReviewSection
  orderStatus={{
    orderId: 'order-123',
    canCurrentUserReview: true,
    hasCurrentUserReviewed: false,
    hasOtherSideReviewed: true,
    otherSideName: '小明',
    otherSideType: 'shopper'
  }}
/>
```

---

## 📱 修改的檔案

### 2. **`bangbuy/components/ReviewModal.tsx`**

**更新內容：**

1. **新增 Props**
```typescript
interface ReviewModalProps {
  orderId?: string;           // 訂單 ID
  onReviewSubmitted?: () => void; // 評價送出後的回調
}
```

2. **送出評價時的行為**
```typescript
const reviewData = {
  rating,
  comment,
  willCooperateAgain,
  targetName,
  targetType,
  orderId: orderId || null,  // 包含訂單 ID
  timestamp: new Date().toISOString()
};

console.log('📝 評價資料（純前端，Uber 式）:', reviewData);

// 通知父組件評價已送出
if (onReviewSubmitted) {
  onReviewSubmitted();
}
```

---

### 3. **`bangbuy/app/wish/[id]/page.tsx`** - 願望詳情頁

**更新內容：**

在頁面底部（接單區域下方）加入 **Uber 式評價區塊**：

```tsx
{!isOwner && user && (
  <div className="mt-8 pt-8 border-t border-gray-100">
    <UberStyleReviewSection
      orderStatus={{
        orderId: wish.id,
        canCurrentUserReview: true,
        hasCurrentUserReviewed: false,
        hasOtherSideReviewed: true,
        otherSideName: wish.buyer?.name || '買家',
        otherSideType: 'buyer'
      }}
    />
  </div>
)}
```

**展示效果：**
- 非作者且已登入：顯示 Uber 式評價區塊
- 可以看到對方是否已評價
- 可以點擊評價按鈕留下評價
- 送出後按鈕變成「已評價 ✓」

---

### 4. **`bangbuy/app/dashboard/page.tsx`** - 會員中心

**更新內容：**

#### **A. 訂單列表的評價按鈕**

在「已完成」的訂單上：

```tsx
{order.status === 'completed' && (
  // 🎨 模擬：ID 結尾是 1 的訂單已評價
  const hasReviewed = order.id.endsWith('1');
  
  return hasReviewed ? (
    <span className="text-xs text-gray-500">
      ✓ 已評價
    </span>
  ) : (
    <button className="bg-orange-500 text-white">
      評價
    </button>
  );
)}
```

**效果：**
- 未評價的訂單：顯示橘色「評價」按鈕
- 已評價的訂單：顯示灰色「✓ 已評價」文字

#### **B. 評價紀錄頁面**

已有的 `ReviewSection` component：
- 顯示平均評分（4.8 ★）
- 顯示評價數量（32 則評價）
- 顯示評價列表（使用假資料）

---

### 5. **`bangbuy/app/page.tsx`** - 首頁願望卡片

**評分 Badge 已經存在：**

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold">
  ⭐ 4.8
</span>
```

**位置：**
- 在買家名稱旁邊
- 黃色背景 + 黃色邊框
- 星星 emoji + 評分數字

---

## 🎨 UI 設計與樣式

### **UberStyleReviewSection（評價區塊）**

```css
/* 外層容器 */
bg-gradient-to-r from-yellow-50 to-orange-50
rounded-xl p-6 border border-orange-100

/* 圖示 */
w-12 h-12 rounded-full bg-orange-100
→ 內部星星圖示：text-orange-600

/* 主按鈕（未評價） */
px-6 py-3 bg-orange-500 text-white font-bold rounded-xl
hover:bg-orange-600 shadow-sm hover:shadow-md

/* 主按鈕（已評價） */
px-6 py-3 bg-gray-200 text-gray-500 font-semibold rounded-xl
cursor-not-allowed

/* 狀態提示（對方已評價） */
text-green-700 font-semibold
→ 綠色勾勾圖示

/* 狀態提示（對方未評價） */
text-gray-600
→ 灰色圖示
```

### **訂單列表評價按鈕**

```css
/* 評價按鈕 */
bg-orange-500 text-white px-3 py-1 rounded-lg font-semibold
hover:bg-orange-600

/* 已評價狀態 */
text-xs text-gray-500 flex items-center gap-1
→ 綠色勾勾圖示
```

### **評分 Badge（卡片上）**

```css
inline-flex items-center gap-1
px-2 py-0.5
bg-yellow-50 text-yellow-700 border border-yellow-200
rounded-full text-xs font-bold
```

---

## 📱 RWD 響應式設計

### **UberStyleReviewSection**
- **手機版**：按鈕全寬 (`w-full`)
- **桌機版**：按鈕自動寬度 (`sm:w-auto`)
- **通用**：flex 排版，圖示和內容並排

### **訂單列表**
- **手機版**：評價按鈕在下方
- **桌機版**：評價按鈕在右側

---

## 🎯 使用流程（Uber 式）

### **情境 1：交易完成後**

1. **買家視角**
   - 進入訂單詳情頁
   - 看到 Uber 式評價區塊
   - 顯示：「評價 代購者」按鈕
   - 狀態：「代購者 已對你做出評價」（綠色）✅

2. **點擊「評價 代購者」**
   - 打開 ReviewModal
   - 選擇 1-5 顆星
   - 填寫評語
   - 勾選「願意再次合作」（可選）
   - 點擊「送出評價」

3. **送出後**
   ```
   console.log 輸出：
   📝 評價資料（純前端，Uber 式）: {
     rating: 5,
     comment: "非常好的合作體驗！",
     willCooperateAgain: true,
     targetName: "小明",
     targetType: "shopper",
     orderId: "order-123",
     timestamp: "2024-01-01T12:00:00.000Z"
   }
   ```
   - 按鈕變成「已評價 ✓」（灰色，disabled）
   - 狀態保持顯示「代購者 已對你做出評價」

---

### **情境 2：對方尚未評價**

1. **顯示狀態**
   - 主按鈕：「評價 買家」（橘色）
   - 狀態：「買家 尚未評價你」（灰色）⭕

2. **送出評價後**
   - 按鈕變成「已評價 ✓」
   - 狀態仍然顯示「買家 尚未評價你」
   - 等待對方評價

---

### **情境 3：雙方都已評價**

1. **顯示狀態**
   - 按鈕：「已評價 ✓」（灰色，disabled）
   - 狀態：「對方 已對你做出評價」（綠色）✅

2. **效果**
   - 雙方都不能再修改評價
   - 評價進入歷史紀錄
   - 可在個人頁面查看

---

## 🎨 假資料說明

### **評價狀態模擬**

在各個 Component 中使用假資料模擬不同狀態：

```typescript
// 未評價狀態
{
  hasCurrentUserReviewed: false,
  hasOtherSideReviewed: true
}

// 已評價狀態
{
  hasCurrentUserReviewed: true,
  hasOtherSideReviewed: true
}

// 對方未評價
{
  hasCurrentUserReviewed: false,
  hasOtherSideReviewed: false
}
```

### **訂單列表的評價狀態模擬**

```typescript
// 使用 orderId 結尾判斷（假資料邏輯）
const hasReviewed = order.id.endsWith('1');
```

---

## ✅ 再次確認：沒有動到底層邏輯

### ❌ **完全沒有修改：**

- ✅ **Supabase 程式碼**
  - 沒有 `from`、`select`、`insert`、`update`、`auth`
  
- ✅ **useEffect**
  - 沒有修改任何 useEffect 內容或依賴陣列
  
- ✅ **資料流**
  - 沒有修改現有 state 結構
  - `wishes`、`myOrders`、`user` 等完全不變
  
- ✅ **現有邏輯**
  - 沒有影響任何現有功能
  - 訂單流程、願望卡片、收藏等都保持原樣

### ✅ **只新增了：**

- ✅ 1 個新 Component（`UberStyleReviewSection`）
- ✅ 更新 `ReviewModal`（加入 `orderId` 和 `onReviewSubmitted`）
- ✅ Local State（`hasCurrentUserReviewed`、`hasOtherSideReviewed` 等）
- ✅ 假資料邏輯（用於模擬評價狀態）
- ✅ UI 元素和樣式

---

## 🎉 完整功能清單

1. ✅ **Uber 式評價區塊**
   - 雙向評價狀態顯示
   - 我是否已評價 / 對方是否已評價
   - 動態按鈕狀態

2. ✅ **評價 Modal**
   - 星星評分（1-5 顆星）
   - 評語 textarea
   - 「願意再次合作」checkbox
   - 送出後更新父組件狀態

3. ✅ **訂單列表評價按鈕**
   - 已完成訂單顯示評價按鈕
   - 已評價顯示 ✓ 狀態
   - 使用假資料模擬

4. ✅ **個人頁面評價區塊**
   - 平均評分（4.8 ★）
   - 評價列表（假資料）
   - 評分分布長條圖

5. ✅ **願望卡片評分 Badge**
   - ⭐ 4.8
   - 黃色配色

6. ✅ **完整的 RWD 支援**

7. ✅ **美觀的 UI 設計**

---

## 🚀 未來擴展建議

當需要接上真實資料時：

### 1. 資料庫結構

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  reviewer_id UUID REFERENCES profiles(id),
  reviewee_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  will_cooperate_again BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 查詢評價狀態

```typescript
// 查詢我是否已評價
const { data: myReview } = await supabase
  .from('reviews')
  .select('*')
  .eq('order_id', orderId)
  .eq('reviewer_id', currentUserId)
  .single();

const hasCurrentUserReviewed = !!myReview;

// 查詢對方是否已評價我
const { data: otherReview } = await supabase
  .from('reviews')
  .select('*')
  .eq('order_id', orderId)
  .eq('reviewer_id', otherUserId)
  .single();

const hasOtherSideReviewed = !!otherReview;
```

### 3. 送出評價

```typescript
const { error } = await supabase
  .from('reviews')
  .insert({
    order_id: orderId,
    reviewer_id: currentUserId,
    reviewee_id: targetUserId,
    rating,
    comment,
    will_cooperate_again: willCooperateAgain
  });
```

### 4. 計算平均評分

```typescript
const { data: reviews } = await supabase
  .from('reviews')
  .select('rating')
  .eq('reviewee_id', userId);

const averageRating = reviews.length > 0
  ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  : 0;
```

---

## 📝 總結

這是一個**完整的 Uber 式雙向評價系統 UI 原型**，包含：

- ✅ 雙向評價機制
- ✅ 評價狀態追蹤
- ✅ 動態 UI 更新
- ✅ 評分展示系統
- ✅ 假資料模擬

**完全使用前端技術實作，不動任何底層邏輯、Supabase、或資料流！** 🎉










