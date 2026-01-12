import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Notification } from '@/types/notifications';

/**
 * 🎯 處理通知點擊行為（純前端）
 * 
 * 功能：
 * 1. 導航到目標路徑
 * 2. 如果有 targetElementId，滾動到對應元素
 * 
 * @param notification - 通知物件
 * @param router - Next.js router instance
 * @param onMarkAsRead - 標記為已讀的回調函數（可選）
 */
export function handleNotificationClick(
  notification: Notification,
  router: AppRouterInstance,
  onMarkAsRead?: (id: string | number) => void
) {
  console.log('📌 通知點擊:', notification.id, notification.title);

  // 1. 標記為已讀（如果有提供回調）
  if (onMarkAsRead) {
    onMarkAsRead(notification.id);
  }

  // 2. 🎯 優先處理跳轉到聊天頁面（如果有 targetUserId）
  if (notification.targetUserId) {
    // 🔍 Debug：檢查 targetUserId 是否有效
    console.log('🔍 [DEBUG] notification.targetUserId:', notification.targetUserId);
    
    const isValidUUID = notification.targetUserId && 
                       notification.targetUserId !== '00000000-0000-0000-0000-000000000000' &&
                       notification.targetUserId.length > 10;
    
    if (!isValidUUID) {
      console.error('❌ targetUserId 無效或為全 0 UUID:', notification.targetUserId);
      alert('無法開啟聊天：目標用戶 ID 無效');
      return;
    }
    
    console.log('✅ 導航到聊天頁面，對象:', notification.targetUserId);
    router.push(`/chat?target=${notification.targetUserId}`);
    return;
  }

  // 3. 導頁與滾動處理
  if (notification.targetPath) {
    console.log('🎯 導航到:', notification.targetPath);

    // 如果有指定要滾動到的元素
    if (notification.targetElementId) {
      console.log('📍 目標元素:', notification.targetElementId);

      // 先導頁
      router.push(notification.targetPath);

      // 延遲後嘗試滾動（等待頁面載入和渲染）
      setTimeout(() => {
        scrollToElementById(notification.targetElementId!);
      }, 500);
    } else {
      // 只導頁，不滾動
      router.push(notification.targetPath);
    }
  } else {
    console.log('ℹ️ 無目標路徑');
  }
}

/**
 * 🎯 滾動到指定元素（純前端 DOM 操作）
 * 
 * @param elementId - 元素的 ID
 * @param behavior - 滾動行為（'smooth' 或 'auto'）
 */
export function scrollToElementById(
  elementId: string,
  behavior: ScrollBehavior = 'smooth'
) {
  const element = document.getElementById(elementId);
  
  if (element) {
    element.scrollIntoView({
      behavior,
      block: 'start',
      inline: 'nearest'
    });
    console.log('✅ 滾動到元素:', elementId);
    
    // 可選：添加視覺高亮效果
    element.classList.add('notification-target-highlight');
    setTimeout(() => {
      element.classList.remove('notification-target-highlight');
    }, 2000);
  } else {
    console.log('⚠️ 找不到元素:', elementId);
  }
}

/**
 * 🎨 格式化未讀數量顯示（用於 badge）
 * 
 * @param count - 未讀數量
 * @returns 格式化後的字串（例如：'9+'）
 */
export function formatUnreadCount(count: number): string {
  if (count === 0) return '';
  if (count > 9) return '9+';
  return count.toString();
}

