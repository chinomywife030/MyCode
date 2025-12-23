'use client';

/**
 * 📡 簡易 Event Bus
 * 
 * 用於跨組件通信，例如：
 * - 通知點擊後觸發 conversations 刷新
 * - 訊息發送後觸發 notifications 刷新
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // 回傳 unsubscribe 函數
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }
}

// 單例
export const eventBus = new EventBus();

// 預定義事件名稱
export const Events = {
  CONVERSATIONS_REFRESH: 'conversations:refresh',
  NOTIFICATIONS_REFRESH: 'notifications:refresh',
  MESSAGES_REFRESH: 'messages:refresh',
  CHAT_OPEN: 'chat:open',
} as const;











