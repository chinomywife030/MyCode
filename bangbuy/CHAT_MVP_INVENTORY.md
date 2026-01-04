# 聊天系統盤點結果

## 1. 相關檔案清單

### Core/Data Layer
- `packages/core/src/messaging/index.ts` - 核心 messaging 函數
- `apps/mobile/src/lib/messaging.ts` - Mobile 包裝層
- `apps/mobile/src/lib/chat.ts` - startChat 函數

### UI Components (Web)
- `components/chat/ChatRoom.tsx` - Web 聊天室組件
- `components/chat/ConversationList.tsx` - Web 對話列表
- `app/chat/page.tsx` - Web 聊天頁面

### Mobile Pages
- `apps/mobile/app/(tabs)/messages.tsx` - 訊息列表頁（目前是空的）
- `apps/mobile/app/(tabs)/index.tsx` - Home 頁（有 TripCard/WishCard）

### UI Components (Mobile)
- `apps/mobile/src/ui/TripCard.tsx` - 有 `onMessagePress` 按鈕
- `apps/mobile/src/ui/WishCard.tsx` - 沒有私訊按鈕

### Hooks (Web)
- `hooks/useMessages.ts` - Web 訊息 hook
- `hooks/useConversations.ts` - Web 對話列表 hook
- `hooks/useRealtimeChat.ts` - Web 即時聊天 hook

### Migration Files
- `migration-chat-system.sql` - 初始聊天系統
- `migration-chat-v2.sql` - V2 版本
- `migration-stabilization-complete.sql` - 穩定化版本
- `migration-notifications-and-chat-fix-v2.sql` - 最新修復版本
- `migration-rpc-conversation-list.sql` - 對話列表 RPC
- `migration-messages-rpc.sql` - 訊息 RPC
- `migration-simple-rpc.sql` - 簡化版 RPC

## 2. Supabase Tables

### conversations 表
**欄位**：
- `id` (UUID, PK)
- `user1_id` (UUID, NOT NULL, FK → profiles)
- `user2_id` (UUID, NOT NULL, FK → profiles)
- `user_low_id` (UUID) - 正規化的較小 ID
- `user_high_id` (UUID) - 正規化的較大 ID
- `source_type` (TEXT) - 'wish_request' | 'trip' | 'listing' | 'legacy' | 'direct'
- `source_id` (UUID) - 來源 ID
- `source_title` (TEXT) - 來源標題
- `source_key` (TEXT, NOT NULL, DEFAULT 'direct') - 唯一鍵的一部分
- `user1_last_read_at` (TIMESTAMPTZ)
- `user2_last_read_at` (TIMESTAMPTZ)
- `last_message_at` (TIMESTAMPTZ, DEFAULT NOW())
- `last_message_preview` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**唯一索引**：
- `idx_conversations_stable_unique` ON (user_low_id, user_high_id, COALESCE(source_type, 'direct'), COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid))

### messages 表
**欄位**：
- `id` (UUID, PK)
- `conversation_id` (UUID, NOT NULL, FK → conversations)
- `sender_id` (UUID, NOT NULL, FK → profiles)
- `content` (TEXT, NOT NULL)
- `client_message_id` (TEXT, NOT NULL) - 前端生成的唯一 ID
- `status` (TEXT, DEFAULT 'sent') - 'sending' | 'sent' | 'failed'
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**唯一約束**：
- UNIQUE(conversation_id, client_message_id)

### blocks 表（封鎖）
- `id`, `blocker_id`, `blocked_id`, `reason`, `created_at`

### reports 表（檢舉）
- `id`, `reporter_id`, `reported_id`, `conversation_id`, `reason`, `description`, `status`, `created_at`

## 3. RPC 函數

### get_or_create_conversation
**簽名**：`get_or_create_conversation(p_target UUID, p_source_type TEXT DEFAULT 'direct', p_source_id UUID DEFAULT NULL, p_source_title TEXT DEFAULT NULL)`
**返回**：`TABLE (conversation_id UUID, is_new BOOLEAN)`
**功能**：查找或建立對話（使用 user_low_id/user_high_id 匹配）

### get_conversation_list
**簽名**：`get_conversation_list(p_limit int default 30, p_before timestamptz default null)` 或 `get_conversation_list()`（無參數版本）
**返回**：對話列表（包含 other_user_id, last_message_at, last_message_preview, unread_count）

### get_messages
**簽名**：`get_messages(p_conversation_id uuid)`
**返回**：訊息列表（依 created_at ASC）
**注意**：目前版本只接受 conversation_id，沒有 limit/before 參數

### send_message
**簽名**：`send_message(p_conversation_id UUID, p_content TEXT, p_client_message_id TEXT)`
**返回**：`TABLE (message_id UUID, error_code TEXT, error_message TEXT)` 或 `JSONB`
**功能**：發送訊息並更新 conversations.last_message_at 和 last_message_preview

### mark_as_read
**簽名**：`mark_as_read(p_conversation_id uuid)`
**返回**：`BOOLEAN`
**功能**：更新 user1_last_read_at 或 user2_last_read_at

## 4. 現有 Functions/Hooks

### Core Functions (packages/core/src/messaging/index.ts)
- ✅ `getConversations(options?)` - 使用 `get_conversation_list` RPC
- ✅ `getMessages(conversationId, options?)` - 使用 `get_messages` RPC（但 RPC 不支持 options）
- ✅ `sendMessage(params)` - 使用 `send_message` RPC
- ✅ `getOrCreateConversation(params)` - 使用 `get_or_create_conversation` RPC（參數名稱可能不匹配）
- ✅ `markAsRead(conversationId)` - 使用 `mark_as_read` RPC
- ✅ `blockUser(userId, reason?)` - 使用 `block_user` RPC
- ✅ `unblockUser(userId)` - 使用 `unblock_user` RPC

### Mobile Wrappers (apps/mobile/src/lib/messaging.ts)
- ✅ 所有 core functions 的 re-export

### Mobile Chat Helper (apps/mobile/src/lib/chat.ts)
- ✅ `startChat(targetUserId, sourceType, sourceId, sourceTitle)` - 開啟對話並導航

## 5. 已知問題

1. **RPC 參數不匹配**：
   - Core 使用 `p_target_user_id`，但實際 RPC 使用 `p_target`
   - 需要修正 core messaging

2. **get_messages 不支持分頁**：
   - Core 嘗試傳遞 `limit` 和 `before`，但 RPC 不接受這些參數
   - 需要修正 core messaging 或更新 RPC

3. **get_conversation_list 參數不一致**：
   - 有兩個版本：有參數和無參數
   - Core 使用有參數版本，但參數順序可能不對

4. **WishCard 沒有私訊按鈕**：
   - 需要添加 `onMessagePress` prop 和按鈕

5. **messages.tsx 是空的**：
   - 需要實作真實的對話列表

6. **沒有 chat/[id].tsx**：
   - 需要創建聊天室頁面




