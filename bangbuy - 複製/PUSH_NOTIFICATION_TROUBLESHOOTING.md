# 🔍 推送通知問題排查指南

## 快速檢查步驟

### 1. 檢查設備 Token 是否已註冊

訪問調試 API：
```
GET https://bangbuy.app/api/push/debug?userId=<你的用戶ID>
```

或者查看所有 tokens：
```
GET https://bangbuy.app/api/push/debug
```

**檢查項目：**
- ✅ `userTokensCount > 0`：表示該用戶有註冊的 token
- ✅ `tokenPreview` 以 `ExponentPushToken[...]` 開頭
- ✅ `lastSeenAt` 是最近的時間（表示 token 是活躍的）

### 2. 檢查用戶 ID 是否匹配

**問題：** 如果 token 是在**未登入時**註冊的，`user_id` 會是 `null`，導致推送找不到用戶。

**解決方法：**
1. 登入後，App 會自動重新註冊 token（綁定 `user_id`）
2. 如果沒有自動註冊，可以在 App 首頁點擊「重試註冊」按鈕
3. 或者重新登入一次

### 3. 檢查推送是否被觸發

查看後端日誌（Vercel Logs）：
```
[POST /api/replies/create] Push sent to <userId>: <sent> devices
```

或者：
```
[POST /api/replies/create] Push failed for user <userId>: <errors> errors. Tokens found: <count>
```

**常見問題：**
- `Tokens found: 0` → 用戶沒有註冊 token 或 `user_id` 不匹配
- `Tokens found: 1, tokens used: 0` → token 格式錯誤或無效
- `sent: 0, errors: 1` → Expo Push API 返回錯誤

### 4. 檢查 Expo Push Token 格式

**正確格式：**
```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

**錯誤格式：**
- 不是以 `ExponentPushToken[` 開頭
- 長度不對
- 包含特殊字符

### 5. 檢查推送通知權限

在 App 中：
- iOS：設置 → 通知 → BangBuy → 允許通知
- Android：設置 → 應用程式 → BangBuy → 通知 → 允許

### 6. 檢查是否在真實設備上測試

⚠️ **重要：** 推送通知**只能在真實設備**上測試，模擬器/瀏覽器不支持。

## 常見問題和解決方案

### 問題 1：`Tokens found: 0`

**原因：**
- Token 在未登入時註冊（`user_id` 為 `null`）
- 用戶 ID 不匹配

**解決：**
1. 登入 App
2. 等待自動重新註冊 token（或手動點擊「重試註冊」）
3. 檢查調試 API 確認 `user_id` 已更新

### 問題 2：`sent: 0, errors: 1`

**原因：**
- Token 已過期或無效
- Expo Push API 返回錯誤

**解決：**
1. 檢查後端日誌中的錯誤訊息
2. 常見錯誤：
   - `DeviceNotRegistered` → token 已失效，需要重新註冊
   - `InvalidCredentials` → Expo 配置問題
3. 重新註冊 token

### 問題 3：收到推送但點擊沒反應

**原因：**
- 深鏈接配置問題
- App 未正確處理通知點擊事件

**解決：**
1. 檢查 `apps/mobile/src/lib/push.ts` 中的 `handleNotificationResponse` 函數
2. 確認推送的 `data` 欄位包含 `wishId` 或 `url`
3. 檢查 Expo Router 配置

### 問題 4：自己回覆自己的 wish 也收到推送

**原因：**
- 後端邏輯未正確檢查 `wish.buyer_id !== userId`

**解決：**
- 檢查 `app/api/replies/create/route.ts` 第 90 行的條件判斷

## 調試工具

### 1. 調試 API

```bash
# 查看所有 tokens
curl https://bangbuy.app/api/push/debug

# 查看特定用戶的 tokens
curl https://bangbuy.app/api/push/debug?userId=<userId>
```

### 2. 測試推送 API

```bash
curl -X POST https://bangbuy.app/api/push/test \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId>",
    "title": "測試推送",
    "body": "這是一條測試消息"
  }'
```

### 3. 查看 Supabase 數據

在 Supabase Dashboard 中執行：

```sql
-- 查看所有 device tokens
SELECT id, user_id, platform, fcm_token, last_seen_at, created_at
FROM device_tokens
ORDER BY last_seen_at DESC
LIMIT 20;

-- 查看特定用戶的 tokens
SELECT id, user_id, platform, fcm_token, last_seen_at, created_at
FROM device_tokens
WHERE user_id = '<userId>'
ORDER BY last_seen_at DESC;

-- 查看最近的回覆（檢查推送是否觸發）
SELECT id, wish_id, user_id, message, created_at
FROM wish_replies
ORDER BY created_at DESC
LIMIT 10;
```

## 測試流程

1. **準備兩個帳號**
   - 帳號 A：創建 wish
   - 帳號 B：回覆 wish

2. **確保兩個帳號都已註冊 push token**
   - 登入 App
   - 檢查調試 API 確認有 token

3. **測試推送**
   - 帳號 B 回覆帳號 A 的 wish
   - 檢查後端日誌
   - 帳號 A 應該收到推送

4. **驗證深鏈接**
   - 點擊推送通知
   - 應該自動打開 App 並導航到對應的 wish 詳情頁

## 日誌檢查清單

### App 端日誌（React Native Debugger 或終端）

- ✅ `[registerPushToken] ✅ Success` → Token 註冊成功
- ✅ `[registerPushToken] User logged in: <userId>` → 用戶 ID 已綁定

### 後端日誌（Vercel Logs）

- ✅ `[POST /api/replies/create] Reply created: <id>` → 回覆創建成功
- ✅ `[sendToUser] Sending to <count> tokens for userId: <userId>` → 開始發送推送
- ✅ `[POST /api/replies/create] Push sent to <userId>: <sent> devices` → 推送發送成功
- ⚠️ `[POST /api/replies/create] Push failed` → 推送失敗，檢查錯誤詳情

## 聯繫支持

如果以上步驟都無法解決問題，請提供：
1. 調試 API 的響應（`/api/push/debug`）
2. 後端日誌（Vercel Logs）
3. App 端日誌（React Native Debugger）
4. 測試步驟和預期結果








