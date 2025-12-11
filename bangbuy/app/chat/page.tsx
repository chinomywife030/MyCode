'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { sendMessageNotification } from '@/app/actions';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('target');

  interface User {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
    };
  }

  interface Profile {
    id: string;
    name: string;
    avatar_url?: string;
  }

  interface Conversation {
    id: string;
    user1_id: string;
    user2_id: string;
    updated_at?: string;
    otherUser?: Profile;
  }

  interface Message {
    id?: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at?: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化：載入用戶和對話列表
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchConversations(user.id);
      
      if (targetId) {
        handleDirectJump(user.id, targetId);
      }
    }
    init();
  }, [targetId]);

  // 直接跳轉到特定對話
  const handleDirectJump = async (myId: string, targetId: string) => {
    if (myId === targetId) return;
    setLoadingChat(true);

    try {
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      
      if (!targetUser) {
        setLoadingChat(false);
        return;
      }

      let { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${myId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${myId})`)
        .maybeSingle();

      if (!existing) {
        const { data: newChat } = await supabase
          .from('conversations')
          .insert([{ user1_id: myId, user2_id: targetId }])
          .select()
          .single();
        existing = newChat;
        fetchConversations(myId);
      }

      if (existing) {
        setActiveChat({ ...existing, otherUser: targetUser });
        loadMessages(existing.id);
      }
    } catch (error) {
      // 錯誤處理
    } finally {
      setLoadingChat(false);
    }
  };

  // Realtime 訂閱：監聽新訊息
  useEffect(() => {
    if (!activeChat) return;
    
    const channel = supabase
      .channel(`chat:${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeChat.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // 移除臨時訊息，添加真實訊息（避免重複）
          setMessages((prev) => {
            const filtered = prev.filter(m => !m.id?.startsWith('temp-'));
            const exists = filtered.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...filtered, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat?.id]);

  // 載入對話列表
  const fetchConversations = async (userId: string) => {
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    
    if (convs && convs.length > 0) {
      const otherUserIds = convs.map(c => 
        c.user1_id === userId ? c.user2_id : c.user1_id
      );
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', otherUserIds);
      
      const enriched = convs.map(conv => {
        const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
        const profile = profiles?.find(p => p.id === otherId);
        return { ...conv, otherUser: profile };
      });
      setConversations(enriched);
    }
  };

  // 載入訊息歷史
  const loadMessages = async (chatId: string) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true });
    
    setMessages(msgs || []);
    scrollToBottom();
  };

  // 發送訊息（Enter 送出，Shift+Enter 換行）
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !user) return;
    
    const msg = newMessage.trim();
    setNewMessage('');

    // 樂觀更新：立即顯示訊息（UI 優化）
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeChat.id,
      sender_id: user.id,
      content: msg,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    const { error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: activeChat.id,
        sender_id: user.id,
        content: msg
      }]);
    
    if (!error) {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date() })
        .eq('id', activeChat.id);

      // 寄信通知對方
      if (activeChat.otherUser?.id) {
        const myName = user.user_metadata?.name || '使用者';
        sendMessageNotification(activeChat.otherUser.id, myName, msg);
      }
    } else {
      // 如果發送失敗，移除暫時訊息
      setMessages((prev) => prev.filter(m => m.id !== tempMessage.id));
      alert('訊息發送失敗，請稍後再試');
    }
  };

  // Enter 送出，Shift+Enter 換行（UI 行為優化）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        handleSend(e as any);
      }
    }
  };

  // 滾動到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 格式化時間（純 UI 工具函數）
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 md:pb-0">
      <Navbar />
      
      <div className="flex-grow max-w-6xl mx-auto w-full p-4 h-[calc(100vh-144px)] md:h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex h-full">
          
          {/* 左側：對話列表 - 統一風格 */}
          <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${
            activeChat ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>訊息列表</span>
              </h2>
            </div>
            
            <div className="flex-grow overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <span className="text-3xl">👋</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">還沒有訊息</p>
                  <p className="text-xs text-gray-400">開始聊天來連接代購吧</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveChat(conv);
                      loadMessages(conv.id);
                    }}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50 ${
                      activeChat?.id === conv.id
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold shadow-sm">
                      {conv.otherUser?.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        (conv.otherUser?.name?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="font-semibold text-gray-900 truncate text-sm">
                        {conv.otherUser?.name || '會員'}
                      </p>
                      <p className="text-xs text-gray-400">點擊查看訊息</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右側：訊息視窗 - 統一風格 */}
          <div className={`w-full md:w-2/3 flex flex-col ${
            !activeChat ? 'hidden md:flex' : 'flex'
          }`}>
            {loadingChat ? (
              <div className="flex-grow flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm">正在連接代購...</p>
                </div>
              </div>
            ) : activeChat ? (
              <>
                {/* 對話標題 - 統一風格 */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button
                    onClick={() => {
                      setActiveChat(null);
                      router.push('/chat');
                    }}
                    className="md:hidden text-gray-500 hover:text-gray-700 transition p-2 -ml-2 rounded-lg hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    {activeChat.otherUser?.avatar_url ? (
                      <img src={activeChat.otherUser.avatar_url} className="w-full h-full rounded-full object-cover" alt=""/>
                    ) : (
                      (activeChat.otherUser?.name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {activeChat.otherUser?.name || '會員'}
                  </h3>
                </div>

                {/* 訊息列表 - 統一風格 */}
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <span className="text-3xl">💬</span>
                      </div>
                      <p className="text-sm text-gray-600 font-semibold mb-1">這是你們的第一段對話！</p>
                      <p className="text-xs text-gray-400">開始聊天吧 👇</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
                                isMe
                                  ? 'bg-orange-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 訊息輸入框 - 統一風格，Enter 送出 */}
                <form
                  onSubmit={handleSend}
                  className="p-4 bg-white border-t border-gray-100 flex gap-3"
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入訊息... (Enter 送出 / Shift+Enter 換行)"
                    rows={1}
                    className="flex-grow p-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm border border-gray-200 focus:border-blue-500 transition"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2 self-end"
                  >
                    <span className="hidden sm:inline">發送</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center flex-col text-gray-400 bg-gray-50">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <span className="text-4xl">💬</span>
                </div>
                <p className="text-base font-semibold text-gray-600 mb-1">選擇一個聊天對象</p>
                <p className="text-sm text-gray-400">開始對話吧 👈</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">載入聊天室...</p>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
