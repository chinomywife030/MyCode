# 🔗 Deep Link 與登入回跳流程實現

## 📋 改動檔案清單

### 新增檔案
1. **`apps/mobile/src/lib/navigation.ts`**
   - `navigateToRoute()`: 導航到指定路由，自動處理登入檢查
   - `navigateAfterLogin()`: 登入成功後的導航處理

### 修改檔案
1. **`apps/mobile/src/lib/push.ts`**
   - 改進 `handleNotificationResponse()`: 完善深鏈接處理邏輯
   - 改進 `setupNotificationHandlers()`: 防止重複註冊，處理冷啟動場景
   - 添加邊界情況處理（無 data、無 wishId 等）

2. **`apps/mobile/app/wish/[id].tsx`**
   - 添加登入狀態檢查（可選，目前註釋掉）
   - 改進「我要回覆/報價」按鈕：未登入時跳轉到登入頁
   - 處理無 wishId 的情況

3. **`apps/mobile/app/login.tsx`**
   - 添加 `next` 參數支持（從 URL 獲取）
   - 登入成功後自動導航到 `next` 指定的路由

## 🔄 路由流程圖

### 場景 1：已登入用戶點擊推送通知

```
推送通知點擊
    ↓
handleNotificationResponse()
    ↓
提取 wishId (從 data.wishId 或 data.url)
    ↓
navigateToRoute(`/wish/${wishId}`, requireAuth=true)
    ↓
檢查登入狀態 → 已登入 ✅
    ↓
router.push(`/wish/${wishId}`)
    ↓
WishDetailScreen 載入
    ↓
顯示 wish 詳情
```

### 場景 2：未登入用戶點擊推送通知

```
推送通知點擊
    ↓
handleNotificationResponse()
    ↓
提取 wishId
    ↓
navigateToRoute(`/wish/${wishId}`, requireAuth=true)
    ↓
檢查登入狀態 → 未登入 ❌
    ↓
router.push(`/login?next=/wish/${wishId}`)
    ↓
LoginScreen 顯示（帶 next 參數）
    ↓
用戶輸入帳密並登入
    ↓
登入成功
    ↓
navigateAfterLogin(next='/wish/${wishId}')
    ↓
router.replace(`/wish/${wishId}`)
    ↓
WishDetailScreen 載入
    ↓
顯示 wish 詳情
```

### 場景 3：冷啟動（App 關閉）點擊推送

```
App 關閉狀態
    ↓
用戶點擊推送通知
    ↓
App 啟動
    ↓
app/_layout.tsx 初始化
    ↓
initializePushNotifications()
    ↓
setupNotificationHandlers()
    ↓
getLastNotificationResponseAsync() → 獲取冷啟動通知
    ↓
handleNotificationResponse() → 處理通知
    ↓
（後續流程同場景 1 或 2）
```

### 場景 4：邊界情況處理

#### 4.1 無 notification data
```
handleNotificationResponse()
    ↓
檢查 data → null/undefined
    ↓
console.warn + router.push('/')
    ↓
導航到首頁
```

#### 4.2 無 wishId
```
handleNotificationResponse()
    ↓
提取 wishId → null
    ↓
檢查 data.url → 也無效
    ↓
console.warn + router.push('/')
    ↓
導航到首頁
```

#### 4.3 wish 不存在
```
WishDetailScreen
    ↓
fetchWish() → 返回 undefined
    ↓
setNotFound(true)
    ↓
顯示「找不到這個願望單」
    ↓
提供「返回首頁」連結
```

#### 4.4 無 wishId 參數
```
WishDetailScreen
    ↓
useLocalSearchParams() → id 為空
    ↓
setNotFound(true)
    ↓
顯示「找不到這個願望單」
```

## 🛡️ 安全措施

1. **路由驗證**
   - `navigateAfterLogin()` 中驗證路由格式（必須以 `/` 開頭，不能是 `//`）
   - 防止路徑遍歷攻擊

2. **URL 編碼**
   - 使用 `encodeURIComponent()` 和 `decodeURIComponent()` 處理特殊字符

3. **錯誤處理**
   - 所有導航操作都有 try-catch
   - 發生錯誤時至少導航到首頁，避免 App 卡住

## 📱 測試場景

### ✅ 驗收測試清單

- [x] **已登入狀態下點推播**：直接到該 wish
- [x] **未登入狀態下點推播**：先到登入，登入後回到該 wish
- [x] **冷啟動點推播**：仍可到該 wish
- [x] **wish 不存在**：顯示 not found + 返回
- [x] **無 wishId**：回首頁
- [x] **notification data 缺失**：不 crash，導航到首頁

## 🔧 技術細節

### 防止重複註冊 Handler

```typescript
let notificationHandlerRegistered = false;

function setupNotificationHandlers() {
  if (notificationHandlerRegistered) {
    return; // 已註冊，跳過
  }
  // ... 註冊邏輯
  notificationHandlerRegistered = true;
}
```

### 冷啟動處理

```typescript
// 獲取 App 從關閉狀態被通知打開時的初始通知
Notifications.getLastNotificationResponseAsync()
  .then((response) => {
    if (response) {
      handleNotificationResponse(response);
    }
  });
```

### 登入回跳實現

```typescript
// 1. 保存目標路由到 URL 參數
router.push(`/login?next=${encodeURIComponent('/wish/123')}`);

// 2. 登入成功後讀取並導航
const { next } = useLocalSearchParams<{ next?: string }>();
navigateAfterLogin(next);
```

## 📝 注意事項

1. **Wish 詳情頁目前允許匿名查看**
   - 如果需要強制登入，可以取消 `wish/[id].tsx` 中的註釋代碼

2. **回覆功能需要登入**
   - 「我要回覆/報價」按鈕會檢查登入狀態
   - 未登入時會跳轉到登入頁並保存回覆路由

3. **推送通知格式**
   - 後端應確保推送的 `data` 包含 `wishId` 或 `url`
   - 格式：`{ type: 'NEW_REPLY', wishId: 'xxx', url: '/wish/xxx' }`








