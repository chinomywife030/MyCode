'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeChatOptions {
  conversationId: string | null;
  onNewMessage?: (message: any) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseRealtimeChatReturn {
  isConnected: boolean;
  typingUsers: string[];
  setTyping: (isTyping: boolean) => void;
}

export function useRealtimeChat(options: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const { conversationId, onNewMessage, onTyping, onConnectionChange } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 獲取當前用戶
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getUser();
  }, []);

  // 設定打字狀態
  const setTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !currentUserId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUserId,
        is_typing: isTyping,
      },
    });
  }, [currentUserId]);

  // 處理打字廣播
  const handleTyping = useCallback((payload: any) => {
    const { user_id, is_typing } = payload;
    if (user_id === currentUserId) return;

    onTyping?.(user_id, is_typing);

    if (is_typing) {
      setTypingUsers(prev => 
        prev.includes(user_id) ? prev : [...prev, user_id]
      );

      // 5 秒後自動清除打字狀態
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== user_id));
      }, 5000);
    } else {
      setTypingUsers(prev => prev.filter(id => id !== user_id));
    }
  }, [currentUserId, onTyping]);

  // 建立 Realtime 訂閱
  useEffect(() => {
    if (!conversationId) return;

    // 清理舊的 channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    // 訂閱新訊息
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage?.(payload.new);
      }
    );

    // 訂閱打字廣播
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      handleTyping(payload);
    });

    // 訂閱連線狀態
    channel.subscribe((status) => {
      const connected = status === 'SUBSCRIBED';
      setIsConnected(connected);
      onConnectionChange?.(connected);
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setIsConnected(false);
      setTypingUsers([]);
    };
  }, [conversationId, onNewMessage, handleTyping, onConnectionChange]);

  // 處理頁面可見性變化（自動重連）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        // 頁面重新可見時，檢查連線狀態
        const state = channelRef.current.state;
        if (state !== 'joined' && state !== 'joining') {
          channelRef.current.subscribe();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isConnected,
    typingUsers,
    setTyping,
  };
}


