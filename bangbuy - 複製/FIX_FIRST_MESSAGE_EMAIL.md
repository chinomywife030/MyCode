# 🔧 第一則私訊 Email 通知修復報告

## 問題描述
「傳送第一則私訊會寄 Email 給對方」功能之前可用，但現在突然不寄了。

## 架構分析

### 觸發方式：**A. message insert 即時觸發**（非 cron）

**觸發流程：**
1. 用戶發送訊息 → `POST /api/messages/send`
2. `app/api/messages/send/route.ts` 插入訊息到資料庫
3. 判斷是否為第一則訊息（`messageType === 'FIRST_MESSAGE'`）
4. 調用 `sendMessageEmailNotification()` → `lib/messageNotifications.ts`
5. 即時發送 Email（使用 Resend API）

**相關檔案：**
- `app/api/messages/send/route.ts` - 訊息發送 API
- `lib/messageNotifications.ts` - Email 通知邏輯
- `lib/email/sender.ts` - Resend API 封裝

## 修復內容

### 1. 資料庫 Migration
**檔案：** `migration-fix-first-message-email.sql`

**修改內容：**
- 在 `conversations` 表添加 `first_message_email_sent_at` 欄位
- 用於追蹤是否已經發送過第一則訊息 Email
- 創建索引以提升查詢效能

**執行方式：**
```sql
-- 在 Supabase SQL Editor 中執行
-- 檔案：migration-fix-first-message-email.sql
```

### 2. 去重機制
**檔案：** `lib/messageNotifications.ts`

**修改內容：**
- 檢查 `conversations.first_message_email_sent_at` 欄位
- 如果已發送過，直接跳過（避免重複寄信）
- 使用 `UPDATE ... WHERE first_message_email_sent_at IS NULL` 確保原子性
- 如果發送失敗，回滾標記（允許重試）

### 3. 可觀測性增強
**檔案：** `lib/messageNotifications.ts`

**新增 Logs：**
- `conversationId`, `messageId`, `senderId`, `receiverId`
- `receiverEmail`（用於追蹤）
- `messageType`
- 環境變數狀態（masked）
- Resend API 回傳的 `messageId` 和 `status`
- 錯誤 stack trace
- 明確的錯誤提示和修復建議

**Log 格式範例：**
```
[msg-email] ========== First Message Email Notification ==========
[msg-email] conversationId: <uuid>
[msg-email] messageId: <uuid>
[msg-email] senderId: <uuid>
[msg-email] receiverId: <uuid>
[msg-email] receiverEmail: user@example.com
[msg-email] messageType: FIRST_MESSAGE
[msg-email] ✅ EMAIL SENT SUCCESSFULLY
[msg-email] Resend messageId: <resend-id>
```

### 4. 錯誤處理與 Fallback
**檔案：** `lib/messageNotifications.ts`

**新增內容：**
- 檢查環境變數缺失並提供明確提示
- 檢查 Resend API 錯誤並提供修復建議
- 發送失敗時回滾 `first_message_email_sent_at`（允許重試）
- 記錄所有錯誤的完整 stack trace

**常見錯誤提示：**
- `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"` → 設置環境變數
- `RESEND_API_KEY not configured` → 設置 API key
- `EMAIL_FROM not configured` → 設置發信地址
- `Domain verification issue` → 在 Resend 驗證域名
- `API key issue` → 檢查 API key 是否有效

## 測試流程

### 最小測試方法

#### 測試 1: A 發第一則私訊給 B
1. **準備：**
   - 兩個測試帳號 A 和 B
   - 確認 B 的 `notify_msg_new_thread_email = true`
   - 確認環境變數已設置：
     - `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true`
     - `RESEND_API_KEY=<valid-key>`
     - `EMAIL_FROM=<verified-domain>`

2. **執行：**
   - A 發送第一則訊息給 B（開啟新對話）

3. **預期結果：**
   - ✅ B 收到 Email 通知
   - ✅ `conversations.first_message_email_sent_at` 被設置
   - ✅ Logs 顯示 `✅ EMAIL SENT SUCCESSFULLY`
   - ✅ Resend messageId 被記錄

#### 測試 2: A 再發第二則
1. **執行：**
   - A 在同一個對話中發送第二則訊息

2. **預期結果：**
   - ❌ 不再寄「第一則私訊」Email
   - ✅ Logs 顯示 `⏭️ SKIPPED: Not a first message`
   - ✅ `first_message_email_sent_at` 保持不變

#### 測試 3: B 回覆（雙向第一則）
1. **執行：**
   - B 回覆 A（這是 B 發給 A 的第一則訊息）

2. **預期結果：**
   - ✅ A 收到 Email 通知（因為這是 A 收到的第一則來自 B 的訊息）
   - ✅ 該對話的 `first_message_email_sent_at` 保持不變（因為是針對接收者的）

**注意：** 目前的設計是「對接收者而言的第一則訊息」，所以：
- A 發給 B 的第一則 → B 收到 Email
- B 回覆 A 的第一則 → A 收到 Email
- 每個用戶只會收到一次「第一則訊息」Email（針對該對話）

## 驗證方式

### 1. 檢查資料庫
```sql
-- 檢查 first_message_email_sent_at 是否被設置
SELECT id, first_message_email_sent_at, created_at
FROM conversations
WHERE first_message_email_sent_at IS NOT NULL
ORDER BY first_message_email_sent_at DESC
LIMIT 10;

-- 檢查是否有重複發送（應該沒有）
SELECT conversation_id, COUNT(*) as email_count
FROM (
  SELECT DISTINCT conversation_id, first_message_email_sent_at
  FROM conversations
  WHERE first_message_email_sent_at IS NOT NULL
) sub
GROUP BY conversation_id
HAVING COUNT(*) > 1;
```

### 2. 檢查 Logs
在 production 環境中查看：
- `[msg-email]` logs：確認 Email 發送流程
- `[api-send]` logs：確認訊息發送流程
- 確認沒有錯誤 logs

### 3. 檢查環境變數
```bash
# 確認以下環境變數已設置
ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@bangbuy.app
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 故障排除

### 問題 1: Email 沒有發送
**檢查清單：**
1. ✅ `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true` 已設置
2. ✅ `RESEND_API_KEY` 已設置且有效
3. ✅ `EMAIL_FROM` 已設置且域名已在 Resend 驗證
4. ✅ `SUPABASE_SERVICE_ROLE_KEY` 已設置
5. ✅ 用戶的 `notify_msg_new_thread_email = true`
6. ✅ 用戶有有效的 Email 地址

**查看 Logs：**
```bash
# 搜尋相關 logs
grep "[msg-email]" logs.txt | tail -50
```

### 問題 2: 重複發送 Email
**原因：**
- `first_message_email_sent_at` 沒有正確設置
- Race condition（多個請求同時發送）

**解決方法：**
- 檢查 migration 是否已執行
- 確認 `UPDATE ... WHERE first_message_email_sent_at IS NULL` 邏輯正確

### 問題 3: 環境變數缺失
**檢查方法：**
```bash
# 在 Vercel 或其他平台檢查環境變數
# 確認所有必要的變數都已設置
```

**修復方法：**
- 在平台設置環境變數
- 重新部署應用程式

## 相關檔案

- `migration-fix-first-message-email.sql` - 資料庫 migration
- `lib/messageNotifications.ts` - Email 通知邏輯（已修復）
- `app/api/messages/send/route.ts` - 訊息發送 API
- `lib/email/sender.ts` - Resend API 封裝

## 完成標準

✅ **所有檢查清單項目都完成**
✅ **測試流程通過**
✅ **沒有錯誤 logs**
✅ **Email 正常發送**
✅ **沒有重複發送**

完成後，第一則私訊 Email 通知功能應該可以穩定運作！

