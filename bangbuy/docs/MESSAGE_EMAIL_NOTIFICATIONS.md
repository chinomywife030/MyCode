# 🔔 私訊 Email 通知系統

## 概述

這是一個分級通知系統，用於在用戶收到私訊時發送 Email 通知，同時避免過度打擾用戶。

## 通知策略

### 訊息類型

| 類型 | 說明 | 發送時機 |
|------|------|----------|
| `FIRST_MESSAGE` | 新對話的第一則訊息 | 立即發送（若設定開啟） |
| `SYSTEM_MESSAGE` | 系統通知訊息 | 永遠立即發送 |
| `REPLY_MESSAGE` | 一般對話回覆 | 依用戶設定決定 |

### 用戶設定

| 設定項 | 預設值 | 說明 |
|--------|--------|------|
| `notify_msg_new_thread_email` | `true` | 新對話收到第一則訊息時寄 Email |
| `notify_msg_unread_reminder_email` | `true` | 未讀超過 X 小時寄提醒 |
| `notify_msg_every_message_email` | `false` | 每一則私訊都寄 Email |
| `notify_msg_unread_hours` | `12` | 未讀多久後寄提醒（小時） |

### 防濫發機制

1. **5 分鐘內去重**：同一對話 5 分鐘內多則訊息，只通知一次
2. **24 小時提醒限制**：未讀提醒同一對話 24 小時內最多一次
3. **在線檢測**：用戶在線（5 分鐘內有活動）時不發送回覆通知
4. **Email 節流**：同一用戶 10 分鐘內最多 5 封 Email

## 檔案結構

```
bangbuy/
├── migration-message-email-notifications.sql  # 資料庫 Migration
├── lib/
│   ├── messageNotifications.ts               # 核心通知邏輯
│   └── email/
│       └── templates/
│           └── newMessage.ts                 # Email 模板
├── app/
│   ├── api/
│   │   ├── notifications/
│   │   │   └── message/route.ts              # 通知觸發 API
│   │   ├── user/
│   │   │   └── notification-settings/route.ts # 設定 API
│   │   └── cron/
│   │       └── process-unread-reminders/route.ts # Cron Job
│   └── settings/
│       └── page.tsx                          # 設定頁面
└── hooks/
    └── useMessages.ts                        # 已整合通知觸發
```

## 安裝步驟

### 1. 執行資料庫 Migration

在 Supabase SQL Editor 執行：

```sql
-- 完整內容請見 migration-message-email-notifications.sql
```

### 2. 設定環境變數

在 `.env.local` 或 Vercel 環境變數中設定：

```env
# ============================================
# Email 發送設定（必須）
# ============================================
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@bangbuy.app

# ============================================
# Supabase 設定（必須）
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# ============================================
# 私訊通知功能開關（選填，預設啟用）
# ============================================
# 設為 false 可停用整個通知功能
ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=true

# ============================================
# Cron Job 密鑰（選填，用於 Vercel Cron）
# ============================================
CRON_SECRET=your-secret-key-here

# ============================================
# 開發模式設定（選填）
# ============================================
# 設為 true 可在開發環境實際發送 Email
EMAIL_SEND_IN_DEV=false
```

### 3. 設定 Vercel Cron（選填）

在 `vercel.json` 中加入：

```json
{
  "crons": [{
    "path": "/api/cron/process-unread-reminders",
    "schedule": "0,15,30,45 * * * *"
  }]
}
```

或使用 Supabase Scheduled Function。

## API 文檔

### POST /api/notifications/message

觸發訊息通知（由前端自動呼叫）。

**Request Body:**
```json
{
  "messageId": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "content": "訊息內容",
  "messageType": "FIRST_MESSAGE|REPLY_MESSAGE|SYSTEM_MESSAGE",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "sent": true,
  "skipped": false
}
```

### GET /api/user/notification-settings

取得當前用戶的通知設定。

**Response:**
```json
{
  "notify_msg_new_thread_email": true,
  "notify_msg_unread_reminder_email": true,
  "notify_msg_every_message_email": false,
  "notify_msg_unread_hours": 12
}
```

### PUT /api/user/notification-settings

更新通知設定。

**Request Body:**
```json
{
  "notify_msg_new_thread_email": true,
  "notify_msg_unread_reminder_email": true,
  "notify_msg_every_message_email": false,
  "notify_msg_unread_hours": 24
}
```

### GET /api/cron/process-unread-reminders

處理未讀提醒（由 Cron Job 呼叫）。

需要 Authorization Header：`Bearer ${CRON_SECRET}`

## 本地測試

### 1. 測試新對話通知

```bash
# 確保 A 和 B 都是已註冊用戶

# A 開啟與 B 的新對話，發送第一則訊息
# 預期：B 立即收到 Email（標題：💬 A 開啟了一個新對話）
```

### 2. 測試回覆通知（每則都寄）

```bash
# B 在設定頁開啟「每一則私訊都寄 Email」
# A 再發一則訊息給 B
# 預期：B 立即收到 Email
```

### 3. 測試未讀提醒

```bash
# B 關閉「每一則私訊都寄」，開啟「未讀提醒」，設定 1 小時
# A 發訊息給 B
# B 不讀取
# 等待 1+ 小時
# 手動觸發 cron：
curl -X GET http://localhost:3000/api/cron/process-unread-reminders

# 預期：B 收到未讀提醒 Email
```

### 4. 測試防重複

```bash
# A 快速連發 5 則訊息給 B
# 預期：B 只收到 1 封 Email（5 分鐘內去重）
```

## 驗收條件

- [x] A 發第一則給 B → B 立刻收到 Email（若設定開）
- [x] A 再發第二則給 B → B 不會立刻收到 Email（預設）
- [x] B 12 小時未讀 → B 收到未讀提醒（只一次）
- [x] B 已讀後再收到新回覆 → 再計時 12 小時
- [x] B 開啟「每一則都寄」→ 每次 REPLY 都寄

## Feature Flag

功能由以下控制：

1. **環境變數**：`ENABLE_MESSAGE_EMAIL_NOTIFICATIONS`（預設啟用，設為 `false` 可停用）
2. **資料庫 Feature Flag**：`feature_flags.message_email_notifications`

**停用功能（二選一）：**

**方法 1：環境變數**
```env
# .env.local 或 Vercel 環境變數
ENABLE_MESSAGE_EMAIL_NOTIFICATIONS=false
```

**方法 2：資料庫 Feature Flag**
```sql
UPDATE feature_flags 
SET enabled_for = 'none' 
WHERE key = 'message_email_notifications';
```

## 故障排除

### Email 沒有發送

1. **檢查環境變數**：
   - `RESEND_API_KEY` 是否設定且有效
   - `EMAIL_FROM` 是否設定且域名已在 Resend 驗證
   - `SUPABASE_SERVICE_ROLE_KEY` 是否設定（用於讀取用戶設定）
   - `ENABLE_MESSAGE_EMAIL_NOTIFICATIONS` 是否為 `true`（或未設定，預設為 true）

2. **檢查資料庫**：
   - `email_outbox` 表的發送記錄（查看是否有錯誤）
   - 用戶的 `profiles` 表中通知設定是否開啟

3. **檢查日誌**：
   - 查看 Server 端 console 輸出
   - 查看 `/api/notifications/message` 的響應

### 未讀提醒沒有發送

1. 檢查 Cron Job 是否正常執行
2. 檢查 `conversation_reminders` 表的提醒記錄
3. 確認 `last_seen_at` 是否正確更新（用戶可能被判定為在線）

### 收到太多 Email

1. 檢查用戶是否開啟了「每一則都寄」
2. 檢查 `email_outbox` 的去重邏輯是否正常
3. 調整 `notify_msg_unread_hours` 的值

