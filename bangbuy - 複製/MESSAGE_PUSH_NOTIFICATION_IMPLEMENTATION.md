# 📱 私訊推播通知實作說明

## 概述

實作使用 Expo Push Notifications 的私訊推播通知功能，當 A 傳訊息給 B 時，B 的手機會收到推播通知。

## 檔案清單

### 新增檔案

1. **`bangbuy/migration-user-push-tokens.sql`**
   - 建立 `user_push_tokens` 表（支援多裝置）
   - 欄位：id, user_id, expo_push_token, platform, created_at, updated_at
   - RLS 政策：用戶只能讀寫自己的 token

2. **`bangbuy/app/api/push/send-message/route.ts`**
   - Next.js API endpoint：`POST /api/push/send-message`
   - 接收：`{ conversationId, messageId, senderId }`
   - 功能：
     - 查詢訊息內容和發送者名稱
     - 查詢對話對方 user_id（排除 senderId）
     - 查詢對方的所有 expo push tokens
     - 呼叫 Expo Push API 發送推播
     - 處理無效 token（自動刪除）
     - 避免 self-notification

### 修改檔案

1. **`bangbuy/apps/mobile/src/lib/push.ts`**
   - 修改 `registerPushToken()` 使用 `user_push_tokens` 表
   - 要求必須登入才能註冊（不允許匿名）
   - 修改 `handleNotificationResponse()` 支援 `conversationId` 導航到聊天室

2. **`bangbuy/packages/core/src/messaging/index.ts`**
   - 在 `sendMessage()` 成功後觸發推播通知
   - 非阻塞發送，失敗不影響訊息發送

## SQL Migration

執行以下 SQL 建立 `user_push_tokens` 表：

```sql
-- 見 bangbuy/migration-user-push-tokens.sql
```

## 設定步驟

### 1. 執行 SQL Migration

在 Supabase SQL Editor 中執行 `migration-user-push-tokens.sql`

### 2. 設定環境變數

在 `apps/mobile/.env` 或環境變數中設定：

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### 3. 確保 App 啟動時註冊 Push Token

`apps/mobile/app/_layout.tsx` 已經在啟動時呼叫 `initializePushNotifications()`，這會：
- 請求通知權限
- 取得 ExpoPushToken
- 註冊到 Supabase

### 4. 確保登入後重新註冊 Token

建議在登入成功後重新註冊 push token（確保 user_id 正確綁定）：

```typescript
// 在登入成功後
import { registerPushToken } from '@/src/lib/push';
await registerPushToken();
```

## 功能流程

### 發送訊息流程

1. 用戶 A 在聊天室發送訊息
2. `sendMessage()` 成功插入訊息到 `messages` 表
3. 更新 `conversations` 表的 `last_message_at` 和 `last_message_preview`
4. 非阻塞呼叫 `/api/push/send-message` API
5. API 端：
   - 查詢訊息內容和發送者名稱
   - 查詢對話對方（B）的 user_id
   - 查詢 B 的所有 expo push tokens
   - 呼叫 Expo Push API 發送推播
   - 標題：`BangBuy`
   - 內容：`{發送者名稱}: {訊息內容前 40 字}`
   - data: `{ conversationId }`

### 接收推播流程

1. B 的手機收到推播通知
2. 用戶點擊通知
3. `handleNotificationResponse()` 處理點擊事件
4. 檢查 `data.conversationId`
5. 導航到 `/chat/[conversationId]`

## 防濫發機制

1. **RLS 政策**：用戶只能讀寫自己的 token
2. **Self-notification 檢查**：發送者不會收到自己的推播
3. **Token 驗證**：自動刪除無效 token（DeviceNotRegistered 等）
4. **錯誤處理**：推播失敗不影響訊息發送

## 測試步驟

### 1. 準備兩個測試帳號

- 帳號 A（發送者）
- 帳號 B（接收者）

### 2. 在兩個裝置上登入

- 裝置 1：登入帳號 A
- 裝置 2：登入帳號 B

### 3. 確認 Push Token 已註冊

在 Supabase 查詢：

```sql
SELECT user_id, expo_push_token, platform, created_at
FROM user_push_tokens
WHERE user_id IN ('user-a-id', 'user-b-id');
```

### 4. 測試發送訊息

- 在裝置 1（帳號 A）進入與帳號 B 的聊天室
- 發送測試訊息
- 檢查裝置 2（帳號 B）是否收到推播通知

### 5. 測試通知點擊

- 點擊推播通知
- 確認是否正確導航到聊天室

### 6. 檢查 API 日誌

在 Vercel Logs 或 Server Logs 中查看：

```
[POST /api/push/send-message] Sending to X tokens for recipient: <user-id>
```

## 常見問題

### Q: 收不到推播通知？

1. 確認裝置是真機（模擬器不支持）
2. 確認已授予通知權限
3. 確認 Push Token 已註冊且 user_id 正確
4. 檢查 API 日誌是否有錯誤

### Q: 點擊通知沒有導航？

1. 確認 `data.conversationId` 存在
2. 檢查 `handleNotificationResponse()` 的日誌
3. 確認路由 `/chat/[id]` 存在

### Q: 發送者收到自己的推播？

檢查 API 中的 self-notification 檢查邏輯是否正確

## 驗收標準

- ✅ A 在 iPhone 傳訊息給 B，B 手機跳推播
- ✅ 點推播能直接進該對話
- ✅ 未登入或沒允許通知時不會崩潰
- ✅ 不把 service role 放進 mobile
- ✅ 推播失敗不影響訊息發送





