// 🎨 通知系統 UI - 資料型別定義（純前端）

export type NotificationType = 'message' | 'order' | 'wishlist' | 'follow' | 'system';

export interface Notification {
  id: string | number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  avatarUrl?: string;
  targetPath?: string;
  targetElementId?: string; // 🎯 用於滾動到特定區塊
  targetUserId?: string; // 🎯 目標使用者 ID（用於跳轉聊天）
}

// 🎨 假資料：模擬通知列表
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: 'message',
    title: '你有新的私訊',
    description: '來自 @小明 的訊息',
    time: '3 分鐘前',
    isRead: false,
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    targetPath: '/chat',
    targetUserId: 'user-001', // 🎯 點擊後跳轉到與小明的聊天
  },
  {
    id: 2,
    type: 'order',
    title: '有人想私訊接單你的願望',
    description: '「東京迪士尼限定玩偶」',
    time: '10 分鐘前',
    isRead: false,
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    targetPath: '/',
    targetElementId: 'wish-section',
  },
  {
    id: 3,
    type: 'order',
    title: '接單報價通知',
    description: '@David 對你的需求報價 NT$ 2,500',
    time: '25 分鐘前',
    isRead: false,
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    targetPath: '/dashboard',
    targetElementId: 'orders-section',
  },
  {
    id: 4,
    type: 'wishlist',
    title: '你的願望被收藏了',
    description: '@小美 收藏了「Selfridges Jellycat 限定款」',
    time: '1 小時前',
    isRead: true,
    avatarUrl: 'https://i.pravatar.cc/150?img=4',
    targetPath: '/dashboard',
  },
  {
    id: 5,
    type: 'follow',
    title: '新的追蹤者',
    description: '@John 開始追蹤你',
    time: '2 小時前',
    isRead: true,
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    targetPath: '/dashboard',
  },
  {
    id: 6,
    type: 'system',
    title: '訂單狀態更新',
    description: '你的訂單「韓國代購」已完成',
    time: '3 小時前',
    isRead: true,
    targetPath: '/dashboard',
  },
  {
    id: 7,
    type: 'message',
    title: '你有新的私訊',
    description: '來自 @Alice 的訊息',
    time: '5 小時前',
    isRead: true,
    avatarUrl: 'https://i.pravatar.cc/150?img=6',
    targetPath: '/chat',
    targetUserId: 'user-002', // 🎯 點擊後跳轉到與 Alice 的聊天
  },
  {
    id: 8,
    type: 'order',
    title: '願望單被接受',
    description: '你的願望「美國限定商品」已有人接單',
    time: '昨天',
    isRead: true,
    avatarUrl: 'https://i.pravatar.cc/150?img=7',
    targetPath: '/dashboard',
    targetUserId: 'user-003', // 🎯 可選：跳轉到與接單者的聊天
  },
  {
    id: 9,
    type: 'system',
    title: '系統通知',
    description: '你的帳戶安全設定已更新',
    time: '2 天前',
    isRead: true,
    targetPath: '/dashboard',
  },
  {
    id: 10,
    type: 'wishlist',
    title: '願望被分享',
    description: '@Tom 分享了你的願望「日本代購」',
    time: '3 天前',
    isRead: true,
    avatarUrl: 'https://i.pravatar.cc/150?img=8',
    targetPath: '/',
  },
];

// 🎨 工具函數：根據通知類型返回圖示和顏色
export const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return {
        icon: 'message',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        iconColor: 'text-blue-600',
      };
    case 'order':
      return {
        icon: 'order',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-600',
        iconColor: 'text-orange-600',
      };
    case 'wishlist':
      return {
        icon: 'heart',
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
        iconColor: 'text-red-500',
      };
    case 'follow':
      return {
        icon: 'user',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600',
        iconColor: 'text-purple-600',
      };
    case 'system':
      return {
        icon: 'info',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        iconColor: 'text-gray-600',
      };
    default:
      return {
        icon: 'info',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        iconColor: 'text-gray-600',
      };
  }
};

// 🎨 工具函數：根據類型返回中文名稱
export const getNotificationTypeName = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return '訊息';
    case 'order':
      return '接單';
    case 'wishlist':
      return '收藏';
    case 'follow':
      return '追蹤';
    case 'system':
      return '系統';
    default:
      return '其他';
  }
};

// 🎯 工具函數：處理通知點擊時的滾動行為（純前端）
export const scrollToElement = (elementId: string, delay: number = 300) => {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      console.log('✅ Scrolled to element:', elementId);
    } else {
      console.log('⚠️ Element not found:', elementId);
    }
  }, delay);
};

