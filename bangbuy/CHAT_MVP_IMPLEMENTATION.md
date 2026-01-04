# 私訊 MVP 實作總結

## 修改的檔案

### Core Layer
1. **`packages/core/src/messaging/index.ts`**
   - 修正 `getOrCreateConversation` 的 RPC 參數名稱：`p_target_user_id` → `p_target`
   - 修正 `getConversations` 以支援有參數和無參數版本的 RPC
   - 修正 `getMessages` 以匹配實際 RPC（只接受 conversation_id，不支持 limit/before）
   - 修正 `sendMessage` 以處理 TABLE 返回格式
   - 添加 profiles 查詢以獲取用戶名稱和頭像

### Mobile App
2. **`apps/mobile/app/(tabs)/messages.tsx`**
   - 實作真實的對話列表載入（使用 `getConversations`）
   - 更新 `handleConversationPress` 以導向 `/chat/[id]`

3. **`apps/mobile/app/chat/[id].tsx`** (新建)
   - 實作聊天室頁面
   - 顯示訊息列表（使用 `getMessages`）
   - 實作發送訊息功能（使用 `sendMessage`）
   - 自動標記為已讀（使用 `markAsRead`）
   - 從 conversation 獲取對方用戶資訊

4. **`apps/mobile/app/_layout.tsx`**
   - 添加 `chat/[id]` 路由

5. **`apps/mobile/src/ui/WishCard.tsx`**
   - 添加 `onMessagePress` prop
   - 添加私訊按鈕 UI

6. **`apps/mobile/app/(tabs)/index.tsx`**
   - 添加 `handleWishMessagePress` 函數
   - 在 WishCard 中傳遞 `onMessagePress` prop

### 文檔
7. **`CHAT_MVP_INVENTORY.md`** (新建)
   - 盤點現有聊天系統的檔案、資料表、RPC 函數

## 現有 Tables/欄位與使用方式

### conversations 表
**主要欄位**：
- `id` (UUID, PK)
- `user1_id`, `user2_id` (UUID, NOT NULL) - 兩個參與者
- `user_low_id`, `user_high_id` (UUID) - 正規化的用戶對（用於唯一索引）
- `source_type` (TEXT) - 'wish_request' | 'trip' | 'listing' | 'legacy' | 'direct'
- `source_id` (UUID) - 來源 ID
- `source_title` (TEXT) - 來源標題
- `source_key` (TEXT) - 唯一鍵的一部分
- `user1_last_read_at`, `user2_last_read_at` (TIMESTAMPTZ) - 已讀時間
- `last_message_at` (TIMESTAMPTZ) - 最後訊息時間
- `last_message_preview` (TEXT) - 最後訊息預覽

**使用方式**：
- 使用 `user1_id` 和 `user2_id` 來識別參與者
- 使用 `user_low_id` 和 `user_high_id` 來防止重複對話
- 使用 `last_message_at` 排序對話列表
- 使用 `user1_last_read_at` 或 `user2_last_read_at` 計算未讀數量

### messages 表
**主要欄位**：
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `sender_id` (UUID, FK → profiles)
- `content` (TEXT, NOT NULL)
- `client_message_id` (TEXT, NOT NULL) - 前端生成的唯一 ID
- `status` (TEXT) - 'sending' | 'sent' | 'failed'
- `created_at` (TIMESTAMPTZ)

**使用方式**：
- 使用 `conversation_id` 查詢對話的所有訊息
- 使用 `created_at` 排序（升序）
- 使用 `client_message_id` 防止重複發送

## RLS 政策

現有的 RLS 政策應該已經足夠，因為：
1. **conversations 表**：使用 RPC 函數（`SECURITY DEFINER`）來繞過 RLS，但 RPC 內部會檢查 `auth.uid() IN (user1_id, user2_id)`
2. **messages 表**：同樣使用 RPC 函數，內部檢查用戶是否是對話成員

如果遇到權限問題，可能需要執行以下 SQL 來確保 RLS 政策正確：

```sql
-- 確保 conversations 表的 RLS 已啟用
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 確保 messages 表的 RLS 已啟用
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 檢查現有政策
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages');
```

## 功能驗收

### ✅ A) 卡片「私訊」按鈕
- [x] WishCard 有私訊按鈕（當有 buyerId 時顯示）
- [x] TripCard 已有私訊按鈕
- [x] 未登入時導向 login
- [x] 已登入時呼叫 `getOrCreateConversation`
- [x] 成功後導向 `/chat/[conversationId]`

### ✅ B) 訊息 tab
- [x] 顯示對話列表（依 `last_message_at` DESC）
- [x] 顯示對方名稱/頭像（從 profiles 表獲取）
- [x] 點擊進聊天室詳情頁

### ✅ C) 聊天室頁
- [x] 顯示 messages（依 `created_at` ASC）
- [x] 可發送文字訊息
- [x] 發送後列表即時更新（重新載入）
- [x] 錯誤有 Alert 提示
- [x] 自動標記為已讀

## 已知限制

1. **分頁**：`get_messages` RPC 目前不支持分頁（limit/before），只返回前 100 條訊息
2. **即時更新**：目前使用重新載入的方式更新訊息列表，沒有使用 Realtime subscription
3. **Optimistic UI**：發送訊息後會重新載入整個列表，沒有 optimistic update

## 後續優化建議

1. 添加 Realtime subscription 以即時接收新訊息
2. 實作 optimistic UI 以提升用戶體驗
3. 添加訊息分頁載入（需要更新 RPC 或使用直接查詢）
4. 添加訊息狀態指示（發送中、已送達、已讀）




