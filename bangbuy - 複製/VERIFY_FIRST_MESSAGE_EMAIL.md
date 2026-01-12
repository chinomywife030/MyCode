# ✅ 第一則私訊 Email 通知驗證步驟

## 部署步驟

### 1. 執行資料庫 Migration
```sql
-- 在 Supabase SQL Editor 中執行
-- 檔案：migration-fix-first-message-email.sql
```

### 2. 設定環境變數（Vercel 或其他平台）
```env
ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@bangbuy.app
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CRON_SECRET=your-secret-key-here
TEST_EMAIL=your-email@example.com  # 用於 forceTest=1
```

### 3. 部署程式碼
```bash
git add .
git commit -m "fix: 修復第一則私訊 Email 通知，添加 cron route 和測試模式"
git push
```

## 驗證步驟

### 步驟 1: 測試寄信功能（forceTest=1）

**目的：** 確認寄信 provider / API key / runtime 正常運作

**執行：**
```bash
# 直接呼叫 cron route（需要 CRON_SECRET）
curl -X GET "https://your-domain.com/api/cron/email?forceTest=1" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**預期結果：**
- ✅ 你應該收到測試 Email（收件地址為 `TEST_EMAIL` 環境變數）
- ✅ Logs 顯示 `[CRON EMAIL] ✅ TEST EMAIL SENT SUCCESSFULLY`
- ✅ 回傳 JSON 包含 `success: true` 和 `messageId`

**如果失敗：**
- 檢查 `RESEND_API_KEY` 是否有效
- 檢查 `EMAIL_FROM` 域名是否已在 Resend 驗證
- 檢查 logs 中的錯誤訊息

### 步驟 2: A 傳第一則私訊給 B

**目的：** 確認第一則私訊 Email 正常發送

**執行：**
1. 用戶 A 發送第一則訊息給用戶 B（開啟新對話）
2. 等待 cron job 執行（或手動觸發 `/api/cron/email`）

**預期結果：**
- ✅ 用戶 B 收到 Email 通知
- ✅ `conversations.first_message_email_sent_at` 被設置
- ✅ `messages.email_notified_at` 被設置
- ✅ Logs 顯示：
  ```
  [CRON EMAIL] Found 1 candidate messages
  [CRON EMAIL] ✅ SENT: Message <messageId> to <receiverEmail>
  ```

**手動觸發 cron（如果需要）：**
```bash
curl -X GET "https://your-domain.com/api/cron/email" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 步驟 3: A 傳第二則 → 不再寄第一則 Email

**目的：** 確認去重機制正常運作

**執行：**
1. 用戶 A 在同一個對話中發送第二則訊息

**預期結果：**
- ❌ 不再寄「第一則私訊」Email
- ✅ `first_message_email_sent_at` 保持不變
- ✅ Logs 顯示：
  ```
  [CRON EMAIL] ⏭️  SKIPPED: Message <messageId> - Email already sent at <timestamp>
  ```

## 檢查 Logs

### 確認 Cron 有被觸發
搜尋 logs 中的：
```
[CRON EMAIL] hit <timestamp>
```

如果看不到此 log，代表：
- Cron 沒有被觸發
- Middleware 攔截了請求
- Runtime 設定錯誤

### 確認處理流程
搜尋 logs 中的：
```
[CRON EMAIL] ========== Processing First Message Emails ==========
[CRON EMAIL] Found X candidate messages
[CRON EMAIL] ✅ SENT: Message <id> to <email>
```

## 故障排除

### 問題 1: forceTest=1 寄不出去

**檢查：**
1. `RESEND_API_KEY` 是否設置且有效
2. `EMAIL_FROM` 是否設置且域名已驗證
3. `TEST_EMAIL` 是否設置

**Logs 檢查：**
```
[CRON EMAIL] ❌ TEST EMAIL FAILED
[CRON EMAIL] Error: <error message>
```

### 問題 2: Cron 沒有被觸發

**檢查：**
1. Vercel Cron 設定是否正確
2. `CRON_SECRET` 是否匹配
3. Route 路徑是否正確（`/api/cron/email`）

**驗證：**
- 手動呼叫 route 確認可以訪問
- 檢查 logs 是否有 `[CRON EMAIL] hit`

### 問題 3: 找不到候選訊息

**檢查：**
1. 是否有 `message_type = 'FIRST_MESSAGE'` 的訊息
2. 是否有 `email_notified_at IS NULL` 的訊息
3. Migration 是否已執行

**SQL 查詢：**
```sql
SELECT COUNT(*) 
FROM messages 
WHERE message_type = 'FIRST_MESSAGE' 
  AND email_notified_at IS NULL;
```

### 問題 4: Email 發送失敗

**檢查：**
1. Resend API 是否正常
2. 接收者 Email 是否有效
3. 是否被 rate limit

**Logs 檢查：**
```
[CRON EMAIL] ❌ FAILED: Message <id> to <email> - Error: <error>
```

## 成功標準

✅ **步驟 1 通過：** forceTest=1 可以 100% 寄信成功
✅ **步驟 2 通過：** A 傳第一則私訊給 B → B 收到 Email
✅ **步驟 3 通過：** A 傳第二則 → 不再寄第一則 Email
✅ **Logs 正常：** 所有關鍵步驟都有對應的 logs
✅ **資料庫正確：** `first_message_email_sent_at` 和 `email_notified_at` 正確設置

完成後，第一則私訊 Email 通知功能應該可以穩定運作！

