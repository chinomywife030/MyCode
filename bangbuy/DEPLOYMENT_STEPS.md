# 🚀 第一則私訊通知修復 - 完整部署步驟

## ✅ 已完成的修改

1. ✅ **資料庫 Migration** - `migration-fix-first-message-notification.sql`
2. ✅ **API 路由增強** - `app/api/messages/send/route.ts` (已添加 debug logs)
3. ✅ **手機版樣式修復** - `app/globals.css` (已修復 input/textarea 顏色)

## 📋 部署步驟

### 步驟 1: 執行資料庫 Migration

1. 登入 Supabase Dashboard
2. 進入 **SQL Editor**
3. 複製 `migration-fix-first-message-notification.sql` 的內容
4. 貼上並執行
5. 確認執行成功，應該看到：
   ```
   ✅ First message notification fix applied
   ```

### 步驟 2: 驗證資料庫結構

在 Supabase SQL Editor 中執行以下查詢確認：

```sql
-- 確認欄位已添加
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND column_name = 'first_message_notified_at';

-- 確認 trigger 存在
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_new_message';

-- 確認 function 存在
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'notify_on_new_message';
```

### 步驟 3: 部署程式碼

#### 如果使用 Vercel：
```bash
# 確保所有修改已 commit
git add .
git commit -m "fix: 修復第一則私訊通知消失問題 + 手機版 input 顏色"
git push

# Vercel 會自動部署
```

#### 如果使用其他平台：
- 確保所有檔案已上傳
- 重新建置並部署應用程式

### 步驟 4: 驗證部署

#### 4.1 檢查 API Logs
發送一則測試訊息後，檢查 server logs 應該看到：
```
[api-send] ========== First Message Detection ==========
[api-send] conversationId: <uuid>
[api-send] senderId: <uuid>
[api-send] receiverId: <uuid>
[api-send] messageCount (excluding receiver own): 0
[api-send] isFirstMessage: true
[api-send] messageType: FIRST_MESSAGE
[api-send] first_message_notified_at: NULL
[api-send] =============================================
```

#### 4.2 測試第一則訊息通知
1. **用戶 A 發送第一則訊息給用戶 B**
   - 用戶 B 應該收到通知 badge
   - 通知列表應該出現「第一則私訊」通知
   - 通知類型應為 `message.first`

2. **檢查資料庫**
   ```sql
   -- 確認 first_message_notified_at 已設置
   SELECT id, first_message_notified_at 
   FROM conversations 
   WHERE first_message_notified_at IS NOT NULL
   ORDER BY first_message_notified_at DESC
   LIMIT 5;
   
   -- 確認通知已創建
   SELECT id, type, title, dedupe_key, created_at
   FROM notifications
   WHERE type = 'message.first'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **用戶 A 再發送第二則訊息**
   - 不應再出現「第一則私訊」通知
   - 應出現一般訊息通知（類型：`message.new`）

#### 4.3 測試手機版 Input 顏色
1. 在 iOS Safari 或 Android Chrome 開啟網站
2. 點擊任何 input 或 textarea
3. 輸入文字，確認文字顏色為深色（#111827）
4. 確認 placeholder 顏色為較淡的灰色（#9ca3af）

### 步驟 5: 監控與除錯

#### 如果通知沒有出現，檢查：

1. **檢查 Trigger 是否執行**
   ```sql
   -- 查看最近的訊息
   SELECT id, conversation_id, sender_id, created_at
   FROM messages
   ORDER BY created_at DESC
   LIMIT 5;
   
   -- 查看對應的通知
   SELECT id, type, title, dedupe_key, created_at
   FROM notifications
   WHERE type IN ('message.first', 'message.new')
   ORDER BY created_at DESC
   LIMIT 10;
   ```

2. **檢查通知偏好設定**
   ```sql
   -- 檢查用戶的通知偏好
   SELECT user_id, inapp_enabled, email_enabled
   FROM notification_preferences
   WHERE user_id = '<receiver_id>';
   ```

3. **檢查是否有錯誤**
   - 查看 Supabase Logs（Dashboard > Logs）
   - 查看應用程式 server logs
   - 檢查是否有 `RAISE NOTICE` 的錯誤訊息

## 🔍 故障排除

### 問題 1: Migration 執行失敗
**可能原因：**
- `conversations` 表不存在
- 權限不足

**解決方法：**
- 確認資料庫結構正確
- 使用 Supabase service role key 執行

### 問題 2: Trigger 沒有執行
**可能原因：**
- Trigger 沒有正確創建
- RLS 政策阻擋

**解決方法：**
```sql
-- 重新創建 trigger
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();
```

### 問題 3: 通知重複創建
**可能原因：**
- `dedupe_key` 唯一約束失效

**解決方法：**
```sql
-- 確認唯一索引存在
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'notifications'
  AND indexname LIKE '%dedupe%';
```

### 問題 4: 手機版文字顏色仍然過淡
**可能原因：**
- CSS 沒有正確載入
- 瀏覽器快取

**解決方法：**
- 清除瀏覽器快取
- 確認 `app/globals.css` 已正確部署
- 檢查是否有其他 CSS 覆蓋樣式

## 📝 檢查清單

- [ ] 資料庫 migration 已執行
- [ ] `first_message_notified_at` 欄位已添加
- [ ] `notify_on_new_message()` function 已更新
- [ ] Trigger 已正確創建
- [ ] 程式碼已部署
- [ ] API logs 顯示正確的 debug 資訊
- [ ] 第一則訊息通知正常顯示
- [ ] 第二則訊息不會重複創建第一則通知
- [ ] 手機版 input/textarea 文字顏色正確

## 🎯 完成標準

✅ **所有檢查清單項目都完成**
✅ **測試流程通過**
✅ **沒有錯誤 logs**
✅ **通知正常顯示**

完成後，第一則私訊通知功能應該可以穩定運作！

