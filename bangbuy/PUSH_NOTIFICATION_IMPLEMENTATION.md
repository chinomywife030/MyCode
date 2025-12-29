# 推送通知實作總結

## 📋 功能概述

實現「新增回覆/報價」事件的推送通知功能，當有人回覆願望單時，會自動發送推送通知給願望單的 owner，點擊通知可深鏈接到對應的 `/wish/[id]` 頁面。

## 📁 新增/修改的檔案

### 1. 後端推送函式
**檔案：`bangbuy/src/server/push/sendToUser.ts`** (新增)
- 功能：發送推送通知給指定用戶
- 主要函式：
  - `sendToUser(userId, payload)`: 查詢用戶的 device tokens 並發送推送
  - 自動清理無效 token
  - 支援 Expo Push Notification

### 2. 後端 API Endpoint
**檔案：`bangbuy/app/api/replies/create/route.ts`** (新增)
- 功能：處理回覆建立 + 觸發推送通知
- 路徑：`POST /api/replies/create`
- 流程：
  1. 驗證輸入（wishId, message）
  2. 查詢 wish 資訊（獲取 buyer_id/owner）
  3. 建立 reply 記錄
  4. 發送推送通知給 owner（如果 owner 存在且不是回覆者本人）
  5. 返回成功結果

### 3. App 端回覆函式
**檔案：`bangbuy/apps/mobile/src/lib/replies.ts`** (修改)
- 修改：`createWishReply()` 函式改為優先呼叫後端 API，失敗時回退到直接寫入
- 變更：
  - 優先嘗試呼叫 `/api/replies/create`（會觸發推播通知）
  - 如果後端 API 不可用（網路錯誤、超時等），自動回退到直接寫入 Supabase
  - 支援環境變數 `EXPO_PUBLIC_API_BASE_URL`（如果未設定，直接使用回退方案）
  - 自動傳遞認證 token（如果已登入）
  - 設定 5 秒超時，避免長時間等待

### 4. 推送通知處理器
**檔案：`bangbuy/apps/mobile/src/lib/push.ts`** (修改)
- 新增：深鏈接處理邏輯
- 新增函式：
  - `handleNotificationResponse()`: 處理推送通知點擊事件
  - `setupNotificationHandlers()`: 設定通知處理器
- 功能：
  - 當收到 `NEW_REPLY` 類型的推送時，自動導航到 `/wish/[id]`
  - 支援 `data.url` 和 `data.wishId` 兩種深鏈接格式

## 🔄 觸發路徑

### 完整流程

```
1. 用戶在 App 中送出回覆
   ↓
2. App 呼叫 createWishReply() (apps/mobile/src/lib/replies.ts)
   ↓
3. createWishReply() 呼叫 POST /api/replies/create
   ↓
4. 後端 API (app/api/replies/create/route.ts) 執行：
   a. 查詢 wish 資訊（獲取 buyer_id）
   b. 建立 reply 記錄
   c. 呼叫 sendToUser() 發送推送
   ↓
5. sendToUser() (src/server/push/sendToUser.ts) 執行：
   a. 查詢 buyer_id 的所有 device tokens
   b. 發送 Expo Push Notification
   c. 清理無效 token
   ↓
6. Owner 的手機收到推送通知
   ↓
7. Owner 點擊通知
   ↓
8. handleNotificationResponse() 處理點擊事件
   ↓
9. 自動導航到 /wish/[id] 頁面
```

## 📝 推送通知格式

### 推送內容
```json
{
  "title": "有人回覆你的需求",
  "body": "回覆內容前 30 字...",
  "data": {
    "type": "NEW_REPLY",
    "wishId": "<wish_id>",
    "url": "/wish/<wish_id>"
  }
}
```

## ⚙️ 環境變數配置

### App 端 (apps/mobile/.env)
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com  # 可選，如果未設定則直接寫入 Supabase（不會觸發推播）
```

**注意**：
- 如果 `EXPO_PUBLIC_API_BASE_URL` 未設定，App 會直接寫入 Supabase（功能可用，但不會觸發推播通知）
- 如果設定了但後端 API 不可用（網路錯誤、超時等），會自動回退到直接寫入 Supabase
- 在開發環境中，如果使用實體裝置，請使用開發機器的實際 IP 地址（例如：`http://192.168.1.100:3000`），而不是 `localhost`

### 後端 (bangbuy/.env)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## ✅ 驗收檢查清單

- [ ] 用另一個帳號/裝置對某 wish 送出回覆
- [ ] Owner 的手機收到推送通知
- [ ] 推送通知標題為「有人回覆你的需求」
- [ ] 推送通知內容為回覆的前 30 字
- [ ] 點擊推送通知可以打開 App
- [ ] 點擊推送通知後自動導航到對應的 `/wish/[id]` 頁面
- [ ] 無效的 device token 會被自動清理

## 🔍 測試步驟

1. **準備兩個帳號/裝置**：
   - 帳號 A：建立一個 wish
   - 帳號 B：對該 wish 送出回覆

2. **確認推送通知**：
   - 帳號 A 的手機應該收到推送通知
   - 檢查推送內容是否正確

3. **測試深鏈接**：
   - 點擊推送通知
   - 確認 App 自動打開並導航到對應的 wish 詳情頁

4. **檢查日誌**：
   - 後端日誌應顯示推送發送成功
   - App 日誌應顯示深鏈接處理成功

## 🐛 常見問題

### 1. 推送通知未收到
- 檢查 device_tokens 表中是否有該用戶的 token
- 檢查推送服務是否正常運作
- 檢查環境變數是否正確配置

### 2. 深鏈接無法導航
- 確認 `handleNotificationResponse()` 已正確設定
- 確認推送通知的 `data` 欄位包含 `wishId` 或 `url`
- 檢查 Expo Router 路由配置

### 3. API 呼叫失敗
- 檢查 `EXPO_PUBLIC_API_BASE_URL` 是否正確配置
- 確認後端服務正在運行
- 檢查網路連線
- **如果後端 API 不可用，App 會自動回退到直接寫入 Supabase**（功能仍可用，但不會觸發推播）
- 在實體裝置上測試時，請使用開發機器的實際 IP 地址，而不是 `localhost`

## 📚 相關檔案

- `bangbuy/apps/mobile/app/wish/[id]/reply.tsx` - 回覆頁面 UI
- `bangbuy/apps/mobile/app/_layout.tsx` - 推送通知初始化
- `bangbuy/app/api/push/test/route.ts` - 推送測試 API

