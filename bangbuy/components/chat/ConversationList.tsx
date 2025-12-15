'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import Image from 'next/image';

interface ConversationListProps {
  activeConversationId?: string | null;
  // ✅ 支援 async callback（Promise<void>）
  onSelectConversation: (conversation: Conversation) => void | Promise<void>;
}

export default function ConversationList({
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const {
    conversations,
    loading,
    error,
    totalUnread,
    refresh,
  } = useConversations();

  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // 🔐 本地搜索過濾（前端過濾）
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.other_user_name?.toLowerCase().includes(query) ||
      c.last_message_preview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // 滾動事件（簡化版不需要無限滾動）
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const handleScroll = () => {
      // 簡化版：不需要處理
    };

    list.addEventListener('scroll', handleScroll);
    return () => list.removeEventListener('scroll', handleScroll);
  }, [loading]); // 修復：移除未定義的 hasMore 和 loadMore

  // 格式化時間
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  // 獲取頭像 URL 或預設值
  const getAvatarUrl = (conversation: Conversation) => {
    if (conversation.other_user_avatar) {
      return conversation.other_user_avatar;
    }
    // 使用名字的第一個字作為預設頭像
    const initial = (conversation.other_user_name || '?')[0].toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=3b82f6&color=fff`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-500 mb-4">載入對話失敗</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 搜尋欄 */}
      <div className="p-3 border-b">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋對話..."
            className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {totalUnread > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {totalUnread} 則未讀訊息
          </p>
        )}
      </div>

      {/* 對話列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          // Loading skeleton
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center p-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="ml-3 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">還沒有對話</p>
            <p className="text-sm">開始和賣家/代購交流吧！</p>
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full flex items-center p-3 hover:bg-gray-50 transition-colors ${
                  activeConversationId === conversation.id ? 'bg-blue-50' : ''
                } ${conversation.is_blocked ? 'opacity-60' : ''}`}
              >
                {/* 頭像 */}
                <div className="relative flex-shrink-0">
                  <Image
                    src={getAvatarUrl(conversation)}
                    alt={conversation.other_user_name || '用戶'}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conversation.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                    </span>
                  )}
                </div>

                {/* 內容 */}
                <div className="ml-3 flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium truncate ${
                      conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {conversation.other_user_name || '未知用戶'}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  
                  {/* 來源標籤 */}
                  {conversation.source_title && (
                    <p className="text-xs text-blue-500 truncate">
                      {conversation.source_type === 'wish_request' && '📦 '}
                      {conversation.source_type === 'trip' && '✈️ '}
                      {conversation.source_title}
                    </p>
                  )}
                  
                  {/* 最後訊息預覽 */}
                  <p className={`text-sm truncate ${
                    conversation.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                  }`}>
                    {conversation.is_blocked ? '🚫 已封鎖' : (conversation.last_message_preview || '開始對話...')}
                  </p>
                </div>
              </button>
            ))}
            
            {/* 載入更多 */}
            {loading && (
              <div className="p-4 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

