# 🔧 BangBuy 全面穩定化指南

## 📋 執行順序

### 第 1 步：資料庫 Migration（必須先做）

1. **登入 Supabase Dashboard**
   - 前往 SQL Editor

2. **執行穩定化 Migration**
   ```sql
   -- 複製 migration-stabilization-complete.sql 的內容
   -- 貼到 SQL Editor 並執行
   ```

3. **執行通知系統 Migration**
   ```sql
   -- 複製 migration-notifications-v3-complete.sql 的內容
   -- 貼到 SQL Editor 並執行
   ```

4. **驗證**
   ```sql
   -- 檢查 RPC 函數是否存在
   SELECT proname FROM pg_proc WHERE proname IN (
     'get_or_create_conversation',
     'get_conversation_list',
     'mark_notification_read',
     'mark_all_notifications_read',
     'get_unread_notification_count'
   );
   
   -- 應該看到 5 個函數
   ```

---

### 第 2 步：前端修復

執行以下命令更新前端代碼（我會在後續提供完整的修復）：

```bash
cd bangbuy
npm run dev
```

---

## 🎯 修復的問題清單

### A. 資料庫層（✅ 已完成）

1. **Conversations 唯一性**
   - ✅ 使用 `LEAST/GREATEST` 正規化 user pair
   - ✅ Dedupe 重複的 conversations
   - ✅ 建立唯一索引防止未來重複

2. **RPC Functions**
   - ✅ `get_or_create_conversation`：避免重複創建
   - ✅ `get_conversation_list`：不依賴不存在的欄位
   - ✅ 使用 `SECURITY DEFINER` + `SET search_path`
   - ✅ Grant execute 給 authenticated

3. **RLS Policies**
   - ✅ Conversations：只能看到自己參與的
   - ✅ Messages：只能看到自己參與的對話的訊息
   - ✅ Notifications：只能看到自己的通知

4. **Notifications**
   - ✅ `is_read` 欄位（Boolean）
   - ✅ `read_at` 欄位（Timestamp）
   - ✅ RPC：`mark_notification_read`（單筆已讀）
   - ✅ RPC：`mark_all_notifications_read`（全部已讀）
   - ✅ RPC：`get_unread_notification_count`（未讀數）

---

### B. 前端層（🔄 進行中）

1. **Supabase Client 統一**
   - 確保全站使用單一 client instance
   - 避免每次 render 都創建新 client

2. **Realtime 管理**
   - 集中管理所有 realtime channels
   - 確保 unmount 時 cleanup
   - 指數退避重連策略
   - 避免無限重連刷 log

3. **401/403 處理**
   - 自動 refresh token
   - Retry 一次
   - 失敗後登出

4. **Next/Image 修復**
   - 添加 ui-avatars.com 到 allowlist

---

### C. 通知系統（🔄 進行中）

1. **單筆已讀**
   - 樂觀更新 UI
   - 背景呼叫 RPC
   - 失敗 rollback

2. **全部已讀**
   - 樂觀更新 UI（unreadCount = 0）
   - 背景呼叫 RPC
   - 失敗 rollback

3. **Realtime 即時更新**
   - 新通知 → unreadCount +1
   - 插入列表頂部

---

## 🧪 測試步驟

### 測試 1：聊天不重複

```sql
-- 1. 創建兩個測試用戶的對話
SELECT get_or_create_conversation(
  'user2-uuid'::uuid,
  'direct',
  'direct'
);

-- 2. 再次呼叫（應該返回同一個 conversation_id）
SELECT get_or_create_conversation(
  'user2-uuid'::uuid,
  'direct',
  'direct'
);

-- 3. 檢查是否只有一筆
SELECT COUNT(*) FROM conversations
WHERE (user1_id = auth.uid() AND user2_id = 'user2-uuid'::uuid)
   OR (user1_id = 'user2-uuid'::uuid AND user2_id = auth.uid());
-- 應該是 1
```

### 測試 2：RPC 不會 404

```bash
# 在瀏覽器 Console
const { data, error } = await supabase.rpc('get_conversation_list', {
  p_before: null,
  p_limit: 20
});

console.log('Data:', data);
console.log('Error:', error);
// Error 應該是 null
```

### 測試 3：通知已讀

```bash
# 1. 獲取未讀數
const { data: count } = await supabase.rpc('get_unread_notification_count');
console.log('Unread:', count);

# 2. 標記單筆已讀
const { data: result } = await supabase.rpc('mark_notification_read', {
  p_notification_id: 'notification-uuid'
});
console.log('Result:', result);
// 應該返回 { updated: true, unread_count: X }

# 3. 全部已讀
const { data: newCount } = await supabase.rpc('mark_all_notifications_read');
console.log('New count:', newCount);
// 應該是 0
```

### 測試 4：長時間開著不會壞

1. 開啟聊天頁
2. 等待 30 分鐘
3. 切換到其他頁面
4. 再切回聊天頁
5. 發送訊息
6. ✅ 應該正常運作，不需要重整

---

## 🐛 常見問題

### Q1: RPC not found

**原因：** Function 未創建或未 grant execute

**解決：**
```sql
-- 檢查函數是否存在
SELECT proname FROM pg_proc WHERE proname = 'get_conversation_list';

-- 如果不存在，重新執行 migration-stabilization-complete.sql
```

### Q2: 欄位不存在（last_message_preview, user_low_id）

**原因：** 前端代碼使用了不存在的欄位

**解決：**
- `last_message_preview`：由 RPC 動態計算
- `user_low_id/user_high_id`：不需要實際欄位，用 LEAST/GREATEST 計算

### Q3: Realtime 一直重連

**原因：** 沒有正確 cleanup 或遇到 auth 錯誤

**解決：**
- 確保 unmount 時呼叫 `supabase.removeChannel(channel)`
- 檢查 token 是否過期
- 查看 Console 的錯誤訊息

### Q4: 通知紅點不準

**原因：** `is_read` 與 `read_at` 不同步

**解決：**
```sql
-- 同步 is_read 與 read_at
UPDATE notifications 
SET is_read = TRUE 
WHERE read_at IS NOT NULL AND is_read = FALSE;
```

---

## 📊 監控指標

### 資料庫健康度

```sql
-- 1. 檢查重複的 conversations
SELECT 
  LEAST(user1_id, user2_id) AS low_id,
  GREATEST(user1_id, user2_id) AS high_id,
  source_type,
  source_key,
  COUNT(*) AS cnt
FROM conversations
GROUP BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id), source_type, source_key
HAVING COUNT(*) > 1;
-- 應該是空的

-- 2. 檢查 orphan messages（沒有對應 conversation 的訊息）
SELECT COUNT(*) FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c WHERE c.id = m.conversation_id
);
-- 應該是 0

-- 3. 檢查通知未讀數
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_count
FROM notifications
GROUP BY user_id
ORDER BY unread_count DESC
LIMIT 10;
```

### 前端健康度

在瀏覽器 Console：

```javascript
// 1. 檢查 Supabase client 是否單例
console.log('Supabase client:', window.supabase);

// 2. 檢查 Realtime channels
console.log('Active channels:', supabase.getChannels());

// 3. 檢查 Auth 狀態
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

---

## 🚀 部署檢查清單

- [ ] 執行 `migration-stabilization-complete.sql`
- [ ] 執行 `migration-notifications-v3-complete.sql`
- [ ] 驗證所有 RPC 函數存在
- [ ] 驗證 RLS policies 啟用
- [ ] 測試聊天不重複
- [ ] 測試通知已讀功能
- [ ] 測試長時間開著不會壞
- [ ] 檢查 Console 無錯誤
- [ ] 檢查 Realtime 不會無限重連

---

**最後更新：** 2025-12-16












