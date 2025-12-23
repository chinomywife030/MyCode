# 🔔 通知系統 UI 完整實作說明

## 📋 概述

這是一個**完整的通知系統 UI 原型**，完全使用**前端假資料**和 **local state** 實作，不涉及任何後端邏輯、Supabase、或資料抓取。

### ✅ 已實作功能

1. ✅ Navbar 通知鈴鐺 + 未讀 badge
2. ✅ Mobile 底部導航通知按鈕 + 未讀 badge
3. ✅ 通知 Drawer（快速查看最近 5 則通知）
4. ✅ 完整的通知中心頁面（`/notifications`）
5. ✅ 未讀/已讀狀態管理（local state）
6. ✅ 通知類型分類與篩選
7. ✅ **點擊通知跳轉到對應頁面或區塊** ⭐

---

## 📁 檔案結構

### 新增檔案

```
bangbuy/
├── types/
│   └── notifications.ts          # 通知資料型別與假資料
├── hooks/
│   └── useNotifications.ts       # 通知狀態管理 Hook（可選）
├── lib/
│   └── notificationHelpers.ts   # 通知處理工具函數
├── components/
│   ├── NotificationIcon.tsx     # 通知圖示 Component
│   └── NotificationDrawer.tsx   # 通知 Drawer（已更新）
├── app/
│   └── notifications/
│       └── page.tsx              # 通知中心頁面
└── NOTIFICATION_SYSTEM_README.md # 本說明文檔
```

### 修改檔案

```
bangbuy/
├── components/
│   ├── Navbar.tsx                # 加入通知鈴鐺
│   └── BottomNav.tsx             # 加入通知按鈕
└── app/
    └── globals.css               # 加入高亮動畫樣式
```

---

## 🎯 核心功能說明

### 1️⃣ 通知資料結構

#### 檔案：`types/notifications.ts`

**型別定義：**

```typescript
export type NotificationType = 'message' | 'order' | 'wishlist' | 'follow' | 'system';

export interface Notification {
  id: string | number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  avatarUrl?: string;
  targetPath?: string;        // 🎯 導航目標路徑
  targetElementId?: string;   // 🎯 滾動目標元素 ID
}
```

**假資料範例：**

```typescript
{
  id: 2,
  type: 'order',
  title: '有人想私訊接單你的願望',
  description: '「東京迪士尼限定玩偶」',
  time: '10 分鐘前',
  isRead: false,
  avatarUrl: 'https://i.pravatar.cc/150?img=2',
  targetPath: '/',              // 導向首頁
  targetElementId: 'wish-section', // 滾動到首頁的 wish-section
}
```

---

### 2️⃣ 點擊通知跳轉功能 ⭐

#### 檔案：`lib/notificationHelpers.ts`

**核心函數：`handleNotificationClick`**

```typescript
export function handleNotificationClick(
  notification: Notification,
  router: AppRouterInstance,
  onMarkAsRead?: (id: string | number) => void
)
```

**處理邏輯：**

1. **標記為已讀**
   - 呼叫 `onMarkAsRead(notification.id)`
   - 更新 local state

2. **導航到目標頁面**
   - 使用 `router.push(notification.targetPath)`
   - Next.js 原生路由，不涉及後端

3. **滾動到目標區塊**（如果有 `targetElementId`）
   - 先導航
   - 延遲 500ms 等待頁面載入
   - 使用 `document.getElementById(targetElementId)`
   - 呼叫 `scrollIntoView({ behavior: 'smooth' })`
   - 添加高亮動畫效果

**使用範例：**

```typescript
// 在 NotificationDrawer.tsx 或 notifications/page.tsx 中
const handleNotificationClick = (notification: Notification) => {
  // 標記為已讀
  setNotifications(prev => 
    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
  );

  // 使用統一的導航處理函數
  handleNotificationNavigation(notification, router);
};
```

**Console 輸出：**

```
📌 通知點擊: 2 有人想私訊接單你的願望
🎯 導航到: /
📍 目標元素: wish-section
✅ 滾動到元素: wish-section
```

---

### 3️⃣ 滾動高亮效果

#### 檔案：`app/globals.css`

**CSS 動畫：**

```css
.notification-target-highlight {
  animation: notificationHighlight 2s ease-in-out;
}

@keyframes notificationHighlight {
  0% {
    background-color: rgba(249, 115, 22, 0.2);
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4);
  }
  50% {
    background-color: rgba(249, 115, 22, 0.3);
    box-shadow: 0 0 0 10px rgba(249, 115, 22, 0);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
}
```

**效果：**
- 滾動到目標元素時，會有 2 秒的橘色高亮動畫
- 使用橘色（品牌色）作為高亮顏色

---

### 4️⃣ 未讀/已讀狀態管理

#### 使用 Local State（純前端）

**在 NotificationDrawer.tsx 和 notifications/page.tsx 中：**

```typescript
// 1. 初始化（使用假資料）
const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

// 2. 計算未讀數量
const unreadCount = notifications.filter(n => !n.isRead).length;

// 3. 標記單一通知為已讀
const markAsRead = (notificationId) => {
  setNotifications(prev => 
    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
  );
};

// 4. 標記所有為已讀
const markAllAsRead = () => {
  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
};
```

**Badge 顯示邏輯：**

```typescript
// 在 Navbar.tsx 和 BottomNav.tsx 中
const unreadNotificationCount = 2; // 假資料

{unreadNotificationCount > 0 && (
  <span className="badge">
    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
  </span>
)}
```

---

### 5️⃣ 通知類型與配色

**5 種通知類型：**

| 類型      | 中文名稱 | 顏色   | 圖示       |
|-----------|----------|--------|------------|
| message   | 訊息     | 藍色   | 💬 聊天泡泡 |
| order     | 接單     | 橘色   | 🛍️ 購物袋  |
| wishlist  | 收藏     | 紅色   | ❤️ 愛心    |
| follow    | 追蹤     | 紫色   | 👤 使用者  |
| system    | 系統     | 灰色   | ℹ️ 資訊    |

**配色定義：**

```typescript
export const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
      };
    case 'order':
      return {
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-600',
      };
    // ... 其他類型
  }
};
```

---

## 📱 使用流程

### 桌面版（Navbar）

1. 用戶登入後，右上角看到通知鈴鐺 + badge（顯示未讀數量）
2. 點擊鈴鐺 → 右側滑出 Drawer
3. 顯示最近 5 則通知
4. 點擊任一通知：
   - 標記為已讀
   - 關閉 Drawer
   - 跳轉到對應頁面
   - 如果有 `targetElementId`，滾動到該區塊並高亮
5. 點擊「查看所有通知」→ 導向 `/notifications` 頁面

### 手機版（BottomNav）

1. 底部導航看到通知 icon + badge
2. 點擊通知 icon → 導向 `/notifications` 頁面
3. 可以篩選不同類型的通知（全部、訊息、接單、收藏、追蹤、系統）
4. 點擊任一通知 → 標記為已讀 + 跳轉到對應頁面
5. 點擊「全部標記為已讀」→ 所有通知變已讀

---

## 🎨 樣式設計

### 配色（符合品牌橘藍主色系）

- **主按鈕**：橘色 `bg-orange-500`
- **未讀 badge**：橘色 `bg-orange-500`
- **未讀背景**：淺橘色 `bg-orange-50/30`
- **未讀邊框**：橘色 `border-orange-200`
- **高亮動畫**：橘色漸變效果

### 視覺層級

- **未讀通知**：
  - 粗體標題
  - 橘色紅點
  - 淺橘色背景
  - 橘色邊框
  - 顯示「未讀」標籤

- **已讀通知**：
  - 正常粗細標題
  - 無紅點
  - 白色背景
  - 灰色邊框

---

## ⚠️ 重要確認

### ✅ 沒有修改的內容

- ❌ **沒有任何 Supabase 相關程式碼**
  - 沒有 `from`、`select`、`insert`、`update`
  - 沒有 `auth`、`session`
  
- ❌ **沒有修改任何 useEffect**
  - 沒有新增資料抓取邏輯
  - 沒有修改依賴陣列
  
- ❌ **沒有修改現有 state**
  - `wishes`、`messages`、`user`、`auth` 等完全不變
  
- ❌ **沒有新增資料抓取**
  - 沒有 Realtime
  - 沒有 WebSocket
  - 沒有 API 呼叫

### ✅ 只新增的內容

- ✅ **純 UI Component**
  - NotificationIcon
  - NotificationDrawer（更新）
  - Notifications Page
  
- ✅ **資料型別定義**
  - `types/notifications.ts`
  
- ✅ **工具函數**
  - `lib/notificationHelpers.ts`
  
- ✅ **Local State**
  - `notifications`（使用假資料）
  - `unreadCount`（計算未讀數量）
  - `isNotificationOpen`（Drawer 開關）
  
- ✅ **前端路由**
  - 使用 Next.js `router.push()`
  - 純前端導航，不涉及後端
  
- ✅ **DOM 操作**
  - `document.getElementById()`
  - `scrollIntoView()`
  - 純前端滾動行為

---

## 🚀 未來擴展建議

當需要接上真實資料時，可以這樣改：

### 1. 替換假資料

```typescript
// 目前：
const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

// 改為：
useEffect(() => {
  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    setNotifications(data || []);
  }
  fetchNotifications();
}, []);
```

### 2. 標記已讀

```typescript
// 目前：
setNotifications(prev => 
  prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
);

// 改為：
await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId);
```

### 3. Realtime 訂閱

```typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications'
    }, (payload) => {
      setNotifications(prev => [payload.new, ...prev]);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 📝 總結

這是一個**完整的通知系統 UI 原型**，包含：

- ✅ 完整的通知中心頁面
- ✅ 通知 Drawer（快速查看）
- ✅ Navbar 和 BottomNav 整合
- ✅ 未讀/已讀狀態管理
- ✅ 通知類型分類與篩選
- ✅ **點擊通知跳轉到對應頁面或區塊** ⭐
- ✅ 滾動高亮動畫效果
- ✅ 完整的假資料系統

**完全使用前端技術實作，不動任何底層邏輯、Supabase、或資料流！** 🎉














