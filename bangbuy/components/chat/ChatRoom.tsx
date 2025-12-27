'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages, type Message } from '@/hooks/useMessages';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { supabase } from '@/lib/supabase';
import SafeAvatar from '@/components/SafeAvatar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface ChatRoomProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  sourceType?: string;
  sourceId?: string | null;
  sourceTitle?: string | null;
  isBlocked?: boolean;
  onBack?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
}

export default function ChatRoom({
  conversationId,
  otherUser,
  sourceType,
  sourceId,
  sourceTitle,
  isBlocked = false,
  onBack,
  onBlock,
  onReport,
}: ChatRoomProps) {
  const {
    messages,
    loading,
    realtimeConnected,
    sendMessage,
    resendMessage,
    markAsRead,
    refresh: refreshMessages,
  } = useMessages({ conversationId });
  
  // 目前簡化版不支援分頁載入
  const loadingMore = false;
  const hasMore = false;

  const { isConnected, typingUsers, setTyping } = useRealtimeChat({
    conversationId,
  });

  const [inputValue, setInputValue] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // 🏁 完成交易狀態
  const [wishInfo, setWishInfo] = useState<{
    id: string;
    title: string;
    status: string;
    buyer_id: string;
    budget: number;
  } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();
  const { showToast } = useToast();

  // 獲取當前用戶
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    getUser();
  }, []);

  // 🏁 載入 wish 資訊（如果 sourceType 是 wish_request）
  useEffect(() => {
    async function loadWishInfo() {
      if (sourceType !== 'wish_request' || !sourceId || !currentUserId) return;
      
      try {
        const { data: wish, error } = await supabase
          .from('wish_requests')
          .select('id, title, status, buyer_id, budget')
          .eq('id', sourceId)
          .single();
        
        if (!error && wish) {
          setWishInfo(wish);
        }
      } catch (err) {
        console.error('[ChatRoom] Load wish info error:', err);
      }
    }
    
    loadWishInfo();
  }, [sourceType, sourceId, currentUserId]);

  // 🏁 完成交易處理
  const handleCompleteTransaction = async () => {
    if (!wishInfo || !currentUserId || isCompleting) return;
    
    setIsCompleting(true);
    setShowCompleteModal(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('請先登入');
        setIsCompleting(false);
        return;
      }

      const response = await fetch(`/api/wishes/${wishInfo.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        alert('完成交易失敗：' + (result.error || '未知錯誤'));
        setIsCompleting(false);
        return;
      }

      // 顯示成功 Toast
      showToast('success', '交易已完成，已移入歷史訂單', 3000);
      
      // 導向歷史訂單頁
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 1500);

    } catch (error: any) {
      console.error('[Complete Transaction] Error:', error);
      alert('發生錯誤：' + error.message);
      setIsCompleting(false);
    }
  };

  // ✅ 清理 typingTimeout（組件卸載時）
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // ✅ 點擊外部關閉選單
  useEffect(() => {
    if (!showMenu) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // 滾動到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 新訊息時滾動到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // 標記已讀
  useEffect(() => {
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, markAsRead]);

  // 頁面聚焦時標記已讀
  useEffect(() => {
    const handleFocus = () => {
      if (conversationId) {
        markAsRead();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [conversationId, markAsRead]);

  // 無限滾動載入更多（目前簡化版不支援，未來可在此實作）
  // TODO: 實作分頁載入

  // 處理輸入變化（打字狀態）
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // 發送打字狀態
    setTyping(true);
    
    // 停止打字 2 秒後清除打字狀態
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  // 發送訊息
  const handleSend = async () => {
    if (!inputValue.trim() || isBlocked) return;
    
    const content = inputValue.trim();
    setInputValue('');
    setTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const success = await sendMessage(content);
    if (!success) {
      // 失敗時不需要額外處理，useMessages 會標記為 failed
    }
    
    inputRef.current?.focus();
  };

  // 鍵盤事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 重送訊息
  const handleResend = (clientMessageId: string) => {
    resendMessage(clientMessageId);
  };

  // 格式化時間
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化日期分組
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 判斷是否需要顯示日期分組
  const shouldShowDate = (message: Message, index: number) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    const prevDate = new Date(prevMessage.created_at).toDateString();
    const currDate = new Date(message.created_at).toDateString();
    return prevDate !== currDate;
  };


  // 訊息狀態圖示
  const MessageStatus = ({ status }: { status: string }) => {
    switch (status) {
      case 'sending':
        return (
          <span className="text-gray-400 text-xs">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        );
      case 'sent':
        return (
          <span className="text-gray-400 text-xs">✓</span>
        );
      case 'failed':
        return (
          <span className="text-red-500 text-xs">!</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-3 p-1 hover:bg-gray-100 rounded-full md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <SafeAvatar
            src={otherUser.avatar_url}
            name={otherUser.name}
            size={40}
          />
          
          <div className="ml-3">
            <p className="font-medium text-gray-900">{otherUser.name || '未知用戶'}</p>
            {/* 顯示打字狀態（移除在線/離線顯示） */}
            {typingUsers.length > 0 && (
              <p className="text-xs text-blue-500">正在輸入...</p>
            )}
          </div>
        </div>

        {/* 選單 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
              {onBlock && (
                <button
                  onClick={() => { onBlock(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  🚫 {isBlocked ? '解除封鎖' : '封鎖此人'}
                </button>
              )}
              {onReport && (
                <button
                  onClick={() => { onReport(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center"
                >
                  ⚠️ 檢舉
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🏁 完成交易 Sticky 行為列（只在 wish_request 且進行中時顯示） */}
      {wishInfo && 
       sourceType === 'wish_request' && 
       wishInfo.status === 'in_progress' && 
       wishInfo.buyer_id === currentUserId && (
        <div className="sticky top-0 z-10 px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  進行中
                </span>
                <span className="text-sm font-semibold text-gray-700">
                  {wishInfo.title}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>金額：NT$ {Number(wishInfo.budget).toLocaleString()}</span>
                <span>•</span>
                <span>對方：{otherUser.name || '未知'}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isCompleting}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              {isCompleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>完成中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>完成交易</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 來源上下文 */}
      {sourceTitle && (
        <div className="px-4 py-2 bg-blue-50 border-b text-sm">
          <span className="text-gray-600">你們因為：</span>
          {sourceId ? (
            <Link
              href={`/${sourceType === 'wish_request' ? 'wish' : sourceType}/${sourceId}`}
              className="text-blue-600 hover:underline ml-1"
            >
              {sourceType === 'wish_request' && '📦 '}
              {sourceType === 'trip' && '✈️ '}
              {sourceTitle}
            </Link>
          ) : (
            <span className="text-gray-700 ml-1">{sourceTitle}</span>
          )}
        </div>
      )}

      {/* 🔐 防詐提醒 */}
      <div className="px-4 py-2 bg-red-50 border-b flex items-center gap-2">
        <span className="text-lg">🚨</span>
        <p className="text-xs text-red-800">
          <strong>安全提醒：</strong>請勿向陌生人轉帳或提供付款資訊。本平台不介入金流與交易糾紛（見
          <Link href="/disclaimer" className="underline">《免責聲明》</Link>）。
        </p>
      </div>

      {/* 訊息列表 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* 載入更多 */}
        {loadingMore && (
          <div className="text-center py-2">
            <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-blue-100' : 'bg-white'} rounded-2xl p-3 animate-pulse`}>
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p>還沒有訊息</p>
            <p className="text-sm">發送第一則訊息開始對話！</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.sender_id === currentUserId;
            const showDate = shouldShowDate(message, index);

            return (
              <div key={message.id || message.client_message_id}>
                {/* 日期分組 */}
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                )}

                {/* 訊息 */}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                      } ${message.status === 'failed' ? 'opacity-70' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-xs text-gray-400">
                        {formatTime(message.created_at)}
                      </span>
                      {isMe && <MessageStatus status={message.status} />}
                      
                      {/* 重送按鈕 */}
                      {message.status === 'failed' && (
                        <button
                          onClick={() => handleResend(message.client_message_id)}
                          className="text-xs text-red-500 hover:text-red-600 ml-1"
                        >
                          重送
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 封鎖提示 */}
      {isBlocked && (
        <div className="px-4 py-3 bg-gray-100 text-center text-gray-500 text-sm">
          🚫 已封鎖此對話，無法發送或接收訊息
        </div>
      )}

      {/* 輸入區域 */}
      {!isBlocked && (
        <div className="p-3 bg-white border-t">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="輸入訊息..."
              rows={1}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`p-2 rounded-full transition-colors ${
                inputValue.trim()
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 🏁 完成交易確認 Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">確認完成交易</h3>
            <p className="text-gray-600 mb-6">
              確定要完成這筆交易嗎？完成後將無法再修改，訂單會移入歷史訂單。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCompleteTransaction}
                disabled={isCompleting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCompleting ? '處理中...' : '確認完成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

