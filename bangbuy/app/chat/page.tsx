'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('target');

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 初始化
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchConversations(user.id);
    }
    init();
  }, []);

  // 2. 處理網址 target，開啟對話
  useEffect(() => {
    if (user && targetId) {
      startChatWith(targetId);
    }
  }, [user, targetId]);

  // 3. 即時監聽訊息 (Realtime)
  useEffect(() => {
    if (!activeChat) return;

    const channel = supabase
      .channel(`chat:${activeChat.id}`) // 使用唯一的 channel 名稱
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeChat.id}`,
        },
        (payload) => {
          console.log("收到新訊息:", payload);
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  // 抓取聊天列表
  const fetchConversations = async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (data) {
      const enriched = await Promise.all(data.map(async (conv) => {
        const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
        return { ...conv, otherUser: profile };
      }));
      setConversations(enriched);
    }
  };

  // 開啟或建立聊天
  const startChatWith = async (otherUserId: string) => {
    if (!user) return;
    if (user.id === otherUserId) return;

    // 先找有沒有舊的
    let { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .maybeSingle(); // 使用 maybeSingle 避免報錯

    // 沒有就建立新的
    if (!existing) {
      const { data: newChat, error } = await supabase
        .from('conversations')
        .insert([{ user1_id: user.id, user2_id: otherUserId }])
        .select()
        .single();
      
      if (newChat) existing = newChat;
      // 如果建立失敗(例如剛好對方也建立了)，就重抓一次
      if (error) {
         const { data: retry } = await supabase
          .from('conversations')
          .select('*')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
          .maybeSingle();
         existing = retry;
      }
    }

    if (existing) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
      setActiveChat({ ...existing, otherUser: profile });
      
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', existing.id)
        .order('created_at', { ascending: true });
      
      setMessages(msgs || []);
      scrollToBottom();
      
      // 順便重新整理列表，讓新聊天室顯示在左邊
      fetchConversations(user.id);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const msg = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: activeChat.id,
        sender_id: user.id,
        content: msg,
      },
    ]);

    if (error) console.error("發送失敗:", error);
    
    await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', activeChat.id);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow max-w-6xl mx-auto w-full p-4 h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex h-full">
          
          {/* 左邊列表 */}
          <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-lg text-gray-800">💬 訊息列表</h2>
            </div>
            <div className="flex-grow overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-400 mt-10 p-4">
                  <p>尚無訊息</p>
                  <p className="text-xs mt-2">去行程牆或許願牆找人聊聊吧！</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div 
                    key={conv.id}
                    onClick={() => { setActiveChat(conv); startChatWith(conv.otherUser.id); }}
                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50
                      ${activeChat?.id === conv.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-blue-500 font-bold">
                      {conv.otherUser?.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        // 如果沒名字，就顯示 ?，如果有名字顯示首字
                        (conv.otherUser?.name?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      {/* 這裡加強了名字的顯示邏輯 */}
                      <p className="font-bold text-gray-800 truncate">
                        {conv.otherUser?.name || '新會員'}
                      </p>
                      <p className="text-xs text-gray-400">點擊查看訊息</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右邊視窗 */}
          <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
            {activeChat ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-500 mr-2">←</button>
                  <h3 className="font-bold text-gray-800">{activeChat.otherUser?.name || '新會員'}</h3>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm break-words
                          ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="輸入訊息..."
                    className="flex-grow p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300">
                    發送
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center flex-col text-gray-400 bg-gray-50">
                <span className="text-6xl mb-4">💬</span>
                <p>👈 選擇一個對話開始聊天</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}