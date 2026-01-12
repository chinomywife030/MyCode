# 🔧 第一則私訊通知修復報告

## 問題描述
第一則私訊通知之前可用，但現在突然消失。

## 修復方案

### 1. 資料庫 Migration
**檔案：** `migration-fix-first-message-notification.sql`

**修改內容：**
- 在 `conversations` 表添加 `first_message_notified_at` 欄位，用於追蹤是否已經發送過第一則消息通知
- 更新 `notify_on_new_message()` trigger function，添加對第一則消息的特殊處理：
  - 判斷是否為第一則消息（對接收者而言）
  - 檢查是否已經通知過（使用 `first_message_notified_at`）
  - 如果是第一則消息且尚未通知，創建 `message.first` 類型的通知
  - 使用 `dedupe_key` 防止重複通知
- 確保 trigger 正確設置

**執行方式：**
```sql
-- 在 Supabase SQL Editor 中執行
-- 檔案：migration-fix-first-message-notification.sql
```

### 2. API 路由增強 Debug Logs
**檔案：** `app/api/messages/send/route.ts`

**修改內容：**
- 添加詳細的 debug logs（production-safe）：
  - `conversationId`, `senderId`, `receiverId`
  - `messageCount`, `isFirstMessage`, `messageType`
  - `first_message_notified_at` 狀態
  - 通知類型預期值

**Log 格式：**
```
[api-send] ========== First Message Detection ==========
[api-send] conversationId: <uuid>
[api-send] senderId: <uuid>
[api-send] receiverId: <uuid>
[api-send] messageCount (excluding receiver own): <number>
[api-send] isFirstMessage: <boolean>
[api-send] messageType: <FIRST_MESSAGE|REPLY_MESSAGE>
[api-send] first_message_notified_at: <timestamp|NULL>
[api-send] =============================================
```

### 3. 手機版 Input/Textarea 文字顏色修復
**檔案：** `app/globals.css`

**修改內容：**
- 在 `@layer base` 中添加全域樣式：
  - 所有 input 和 textarea 的輸入文字顏色設為 `#111827` (text-gray-900)
  - Placeholder 顏色設為 `#9ca3af` (text-gray-400)
  - 背景顏色設為白色
  - 添加 iOS Safari 兼容性（`-webkit-text-fill-color`）
  - 處理 autofill 樣式
  - 深色模式支持

## 測試流程

### 最小測試流程：
1. **A 傳第一則私訊給 B**
   - B 應該收到通知 badge
   - B 的通知列表應該新增「第一則私訊」通知
   - 通知類型應為 `message.first`
   - `conversations.first_message_notified_at` 應該被設置

2. **A 再傳第二則**
   - 不應再新增「第一則私訊」通知
   - 應該新增一般訊息通知（`message.new`）
   - `first_message_notified_at` 不應改變

3. **Strict Mode / Re-render 測試**
   - 確保在 React strict mode 下不會重複觸發
   - 確保在 re-render 時不會重複創建通知

## 驗證方式

### 1. 檢查資料庫
```sql
-- 檢查 conversations 表的 first_message_notified_at
SELECT id, first_message_notified_at 
FROM conversations 
WHERE first_message_notified_at IS NOT NULL;

-- 檢查通知是否正確創建
SELECT id, type, title, dedupe_key, created_at
FROM notifications
WHERE type = 'message.first'
ORDER BY created_at DESC
LIMIT 10;
```

### 2. 檢查 Logs
在 production 環境中查看：
- `[api-send]` logs：確認 `isFirstMessage` 判斷正確
- `[msg-email]` logs：確認 Email 通知邏輯（如果啟用）

### 3. 前端驗證
- 打開通知列表，確認第一則消息通知出現
- 確認通知 badge 數字正確
- 確認點擊通知可以跳轉到對應聊天室

## 注意事項

1. **Trigger 執行順序**
   - Trigger 在 `AFTER INSERT` 時執行
   - 當前消息已經被插入到資料庫
   - 判斷第一則消息時需要排除當前消息

2. **Dedupe Key**
   - 第一則消息通知使用：`message.first:{conversation_id}`
   - 一般訊息通知使用：`message.new:{message_id}`
   - 使用 `ON CONFLICT` 防止重複

3. **RLS 政策**
   - Trigger 使用 `SECURITY DEFINER`，繞過 RLS
   - 確保通知可以正確創建

4. **iOS Safari 兼容性**
   - 使用 `-webkit-text-fill-color` 確保文字顏色正確顯示
   - 處理 autofill 樣式

## 相關檔案

- `migration-fix-first-message-notification.sql` - 資料庫 migration
- `app/api/messages/send/route.ts` - 訊息發送 API（含 debug logs）
- `app/globals.css` - 全域樣式（含 input/textarea 顏色修復）

## 後續優化建議

1. **監控**
   - 添加 Sentry 監控，追蹤通知創建失敗的情況
   - 監控 `first_message_notified_at` 設置失敗的情況

2. **性能**
   - 考慮為 `first_message_notified_at` 添加索引（已完成）
   - 考慮優化 trigger 中的查詢

3. **測試**
   - 添加單元測試覆蓋 trigger 邏輯
   - 添加 E2E 測試覆蓋完整流程

