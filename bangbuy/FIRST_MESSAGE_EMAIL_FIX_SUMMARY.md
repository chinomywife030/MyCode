# 🔧 第一則私訊 Email 通知修復總結

## 問題描述
「第一則私訊 Email 通知」功能消失，需要定位並修復。

## 架構分析

### 觸發流程
```
用戶發送訊息
    ↓
POST /api/messages/send  (app/api/messages/send/route.ts)
    ↓
判斷是否為 FIRST_MESSAGE（計算 messageCount）
    ↓
sendMessageEmailNotification()  (lib/messageNotifications.ts)
    ↓
sendEmail()  (lib/email/sender.ts，使用 RESEND_API_KEY)
```

### 關鍵檔案
| 檔案 | 用途 |
|------|------|
| `app/api/messages/send/route.ts` | 發送訊息 API，觸發 Email 通知 |
| `lib/messageNotifications.ts` | Email 通知核心邏輯 |
| `lib/email/sender.ts` | Resend API 發送（共用既有 RESEND_API_KEY） |
| `lib/email/templates/newMessage.ts` | Email 模板 |
| `migration-fix-first-message-email.sql` | 資料庫 migration（添加去重欄位） |

### 去重機制
使用 `conversations.first_message_email_sent_at` 欄位：
- 發送前標記為已發送
- 發送失敗後回滾（允許重試）
- 避免重複寄信

---

## 修改的檔案

### 1. `lib/messageNotifications.ts`
**修改內容：**
- 增強開始日誌（包含 Timestamp、content snippet）
- 明確記錄每個環境變數狀態
- 添加 RESEND_API_KEY 存在性檢查
- 改進錯誤提示（指向 Vercel 環境變數設定）

### 2. `app/api/test-first-message-email/route.ts`（新增）
**用途：**
- 測試 Resend 寄信功能
- 驗證環境變數是否正確設定
- 使用方式：`GET /api/test-first-message-email?to=your@email.com`

### 3. `migration-fix-first-message-email.sql`（已存在）
**內容：**
- 添加 `conversations.first_message_email_sent_at` 欄位
- 添加 `messages.email_notified_at` 欄位
- 創建相關索引

---

## 必要的環境變數

確保以下環境變數已在 **Vercel** 中設定：

```env
# 必須設為 "true"（字串）才會啟用
ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true

# 共用既有的 Resend API Key（已用於「有人報價」通知）
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email 發送者地址（需在 Resend 驗證域名）
EMAIL_FROM=BangBuy <noreply@bangbuy.app>

# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**⚠️ 注意：** `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS` 必須是字串 `"true"`，不是布林值。

---

## 驗證步驟

### 步驟 1：執行資料庫 Migration

在 Supabase SQL Editor 中執行：
```sql
-- 檔案：migration-fix-first-message-email.sql
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS first_message_email_sent_at TIMESTAMPTZ;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS email_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_first_message_email_sent 
ON conversations(first_message_email_sent_at) 
WHERE first_message_email_sent_at IS NOT NULL;
```

### 步驟 2：部署程式碼

```bash
git add .
git commit -m "fix: 修復第一則私訊 Email 通知"
git push
```

### 步驟 3：測試寄信功能

部署後，在瀏覽器訪問：
```
https://bangbuy.app/api/test-first-message-email?to=your@email.com
```

**預期結果：**
```json
{
  "success": true,
  "message": "Test email sent successfully! Check your inbox.",
  "messageId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "envStatus": {
    "RESEND_API_KEY": "re_xxxxx...",
    "EMAIL_FROM": "BangBuy <noreply@bangbuy.app>",
    "ENABLE_MESSAGE_EMAIL_NOTIFICATIONS": "true",
    "NODE_ENV": "production"
  }
}
```

**如果失敗：**
- 檢查 `envStatus` 中哪個環境變數是 `(not set)`
- 在 Vercel Dashboard → Settings → Environment Variables 中補上

### 步驟 4：測試真實第一則私訊

1. 用戶 A 發送第一則訊息給用戶 B（開啟新對話）
2. 查看 Vercel Logs（Functions 頁面）
3. 搜尋 `[msg-email]` 或 `[api-send]`

**成功的 Log 範例：**
```
[msg-email] ========================================
[msg-email] ========== First Message Email Notification ==========
[msg-email] Timestamp: 2024-12-27T10:00:00.000Z
[msg-email] conversationId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[msg-email] messageType: FIRST_MESSAGE
[msg-email] ✅ All environment checks passed
[msg-email] receiverEmail: receiver@example.com
[msg-email] ✅ Marked conversation as email-sent (prevents duplicate)
[msg-email] ✅ EMAIL SENT SUCCESSFULLY
[msg-email] Resend messageId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**失敗的 Log 範例：**
```
[msg-email] ❌ BLOCKED: ENABLE_MESSAGE_EMAIL_NOTIFICATIONS is not "true"
[msg-email] 💡 Current value: undefined
[msg-email] 💡 Fix: Set ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true in Vercel environment variables
```

### 步驟 5：驗證去重

1. A 再發一則訊息給 B（同一對話）
2. 預期：不會再寄「第一則私訊」Email
3. Log 應顯示：
```
[msg-email] ⏭️  SKIPPED: Not a first message (type: REPLY_MESSAGE)
```

---

## 故障排除

### 問題 1：Email 沒有發送

**檢查順序：**
1. Vercel Logs 中搜尋 `[msg-email]`
2. 確認環境變數：
   - `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS` = `true`
   - `RESEND_API_KEY` 已設定
   - `EMAIL_FROM` 已設定
3. 確認 Resend API Key 有效（在 Resend Dashboard 測試）
4. 確認 EMAIL_FROM 域名已在 Resend 驗證

### 問題 2：測試端點回傳錯誤

訪問 `/api/test-first-message-email?to=your@email.com`，查看回傳的 `envStatus`：
```json
{
  "success": false,
  "error": "RESEND_API_KEY is not set in environment variables",
  "envStatus": {
    "RESEND_API_KEY": "(not set)",
    ...
  }
}
```

### 問題 3：重複寄信

確認 migration 已執行，`conversations.first_message_email_sent_at` 欄位存在：
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND column_name = 'first_message_email_sent_at';
```

---

## Vercel Cron 說明

目前第一則私訊 Email 通知是**即時觸發**的（在 `/api/messages/send` 中），不需要 Cron。

`vercel.json` 中的 Cron 配置：
```json
{
  "crons": [
    {
      "path": "/api/cron/master",
      "schedule": "0 1 * * *"
    }
  ]
}
```

這個 Cron 是用於「未讀提醒」功能，與第一則私訊 Email 通知無關。

---

## 總結

| 項目 | 狀態 |
|------|------|
| 觸發方式 | 即時（message insert 時） |
| 寄信 Provider | Resend（共用 `RESEND_API_KEY`） |
| 去重機制 | `conversations.first_message_email_sent_at` |
| 測試端點 | `/api/test-first-message-email?to=email` |
| 必要環境變數 | `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true` |

完成以上步驟後，第一則私訊 Email 通知應該可以正常運作！

