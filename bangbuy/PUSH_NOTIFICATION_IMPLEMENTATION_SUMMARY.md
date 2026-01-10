# 📱 App 推播通知功能實作總結

## ✅ 完成項目

### 1. 資料庫 Schema

**新增檔案：`bangbuy/migration-push-tokens.sql`**
- 建立 `push_tokens` 表
- 欄位：`id` (uuid), `user_id` (uuid), `expo_push_token` (text), `platform` (ios/android), `created_at` (timestamptz)
- 設定 RLS 政策：用戶只能讀寫自己的 token
- 建立索引以優化查詢

**執行方式：**
在 Supabase SQL Editor 中執行 `migration-push-tokens.sql`

### 2. App 端推播服務

**新增檔案：`bangbuy/apps/mobile/src/lib/pushService.ts`**
- `requestPushPermission()`: 請求推播權限並取得 Expo Push Token
- `registerPushTokenToSupabase()`: 將 token 註冊到 Supabase（僅在登入後）
- `initializePushService()`: 初始化推播服務（App 啟動時呼叫）

**修改檔案：`bangbuy/apps/mobile/app/_layout.tsx`**
- 第 12 行：新增 `import { initializePushService } from '@/src/lib/pushService';`
- 第 35-38 行：在 `useEffect` 中呼叫 `initializePushService()`

**修改檔案：`bangbuy/apps/mobile/app/login.tsx`**
- 第 47-52 行：註冊成功後呼叫 `registerPushTokenToSupabase()`
- 第 73-78 行：登入成功後呼叫 `registerPushTokenToSupabase()`

**修改檔案：`bangbuy/apps/mobile/app/(tabs)/index.tsx`**
- 第 110-117 行：登入用戶重新註冊 push token 時使用 `pushService`

### 3. 後端 API

**新增檔案：`bangbuy/app/api/push/send/route.ts`**
- `POST /api/push/send` 端點
- 接收參數：`user_id`, `title`, `body`, `data`
- 功能：
  - 從 Supabase 查詢該用戶的所有 push tokens
  - 使用 Expo Push API 發送推播
  - 自動處理無效 token（刪除）
  - 若無 token 則略過，不報錯

### 4. 推播觸發邏輯（最小侵入）

**修改檔案：`bangbuy/packages/core/src/wish/index.ts`**
- 第 7 行：新增 `getApiBaseUrl` import
- 第 184-210 行：在 `createWish()` 成功後，非阻塞觸發推播通知
  - 推播給創建者自己（確認創建成功）
  - 標題：`BangBuy`
  - 內容：`新需求：{標題前 40 字}`
  - Data: `{ type: 'wish_created', wishId: ... }`

**修改檔案：`bangbuy/packages/core/src/messaging/index.ts`**
- 第 293-345 行：在 `sendMessage()` 成功後，非阻塞觸發推播通知
  - 查詢接收者 `user_id`（排除發送者）
  - 查詢發送者名稱
  - 推播給接收者
  - 標題：`BangBuy`
  - 內容：`{發送者名稱}: {訊息內容前 40 字}`
  - Data: `{ type: 'chat_message', chatId: ... }`
  - 避免 self-notification

## 📋 檔案清單

### 新增檔案
1. `bangbuy/migration-push-tokens.sql` - 資料庫 migration
2. `bangbuy/apps/mobile/src/lib/pushService.ts` - App 端推播服務
3. `bangbuy/app/api/push/send/route.ts` - 後端推播 API

### 修改檔案（最小侵入）
1. `bangbuy/apps/mobile/app/_layout.tsx`
   - 第 12 行：新增 import
   - 第 35-38 行：初始化推播服務

2. `bangbuy/apps/mobile/app/login.tsx`
   - 第 47-52 行：註冊後註冊 token
   - 第 73-78 行：登入後註冊 token

3. `bangbuy/apps/mobile/app/(tabs)/index.tsx`
   - 第 110-117 行：使用新的 pushService

4. `bangbuy/packages/core/src/wish/index.ts`
   - 第 7 行：新增 import
   - 第 184-210 行：創建需求後觸發推播

5. `bangbuy/packages/core/src/messaging/index.ts`
   - 第 293-345 行：發送訊息後觸發推播

## 🔧 設定步驟

### 1. 執行資料庫 Migration
在 Supabase SQL Editor 中執行：
```sql
-- 見 bangbuy/migration-push-tokens.sql
```

### 2. 環境變數設定
確保以下環境變數已設定：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key（後端用）
- `EXPO_PUBLIC_PROJECT_ID` - Expo Project ID（App 端用，選填）

### 3. 驗證功能
1. **App 啟動時註冊 token**
   - 啟動 App 並登入
   - 檢查 Supabase `push_tokens` 表是否有新記錄

2. **新需求建立後推播**
   - 創建一個新需求
   - 檢查是否收到推播通知

3. **新私訊建立後推播**
   - A 發送訊息給 B
   - B 應該收到推播通知
   - 點擊通知應導航到聊天室

## ⚠️ 注意事項

1. **非阻塞設計**：所有推播觸發都是非阻塞的，失敗不會影響原本的功能
2. **最小侵入**：只在成功後加 hook，不改變原本的資料流程
3. **錯誤處理**：推播失敗會記錄到 console，但不影響主流程
4. **避免重複註冊**：使用 `tokenRegistrationInProgress` 標記防止重複註冊
5. **自動清理**：無效 token 會自動從資料庫刪除

## 🎯 功能驗證

- ✅ App 啟動時請求推播權限
- ✅ 登入後自動註冊 push token 到 Supabase
- ✅ 新需求建立後觸發推播（給創建者）
- ✅ 新私訊建立後觸發推播（給接收者）
- ✅ 推播失敗不影響原本功能
- ✅ 無效 token 自動清理





