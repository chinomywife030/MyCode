'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('target');

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false); // 右邊載入中
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 初始化使用者 & 載入列表
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // 平行處理：一邊抓列表，一邊處理跳轉，互不卡頓
      fetchConversations(user.id);
      
      // 如果有 target，立刻處理跳轉
      if (targetId) {
        handleDirectJump(user.id, targetId);
      }
    }
    init();
  }, [targetId]); // 當 targetId 改變時也會觸發

  // ⚡️ 極速跳轉邏輯
  const handleDirectJump = async (myId: string, targetId: string) => {
    if (myId === targetId) return;
    setLoadingChat(true);

    try {
      // 1. 先確認這個人存不存在 (順便抓他的頭像名字)
      const { data: targetUser, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();
        
      if (uErr || !targetUser) {
        alert('找不到該用戶');
        setLoadingChat(false);
        return;
      }

      // 2. 直接去資料庫問：我跟他有沒有聊天室？
      let { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${myId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${myId})`)
        .maybeSingle();

      // 3. 如果沒有，立刻建立一個
      if (!existing) {
        const { data: newChat } = await supabase
          .from('conversations')
          .insert([{ user1_id: myId, user2_id: targetId }])
          .select()
          .single();
        existing = newChat;
        // 建立新聊天後，重新整理一下列表，讓新的人出現在左邊
        fetchConversations(myId);
      }

      // 4. 設定當前聊天 (不用等列表載入完，直接顯示！)
      if (existing) {
        setActiveChat({ ...existing, otherUser: targetUser });
        loadMessages(existing.id);
      }

    } catch (error) {
      console.error('跳轉失敗', error);
    } finally {
      setLoadingChat(false);
    }
  };

  // Realtime 監聽
  useEffect(() => {
    if (!activeChat) return;
    const channel = supabase
      .channel(`chat:${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeChat.id}` }, 
      (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id]);

  const fetchConversations = async (userId: string) => {
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (convs && convs.length > 0) {
      const otherUserIds = convs.map(c => c.user1_id === userId ? c.user2_id : c.user1_id);
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', otherUserIds);
      
      const enriched = convs.map(conv => {
        const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
        const profile = profiles?.find(p => p.id === otherId);
        return { ...conv, otherUser: profile };
      });
      setConversations(enriched);
    }
  };

  const loadMessages = async (chatId: string) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true });
    
    setMessages(msgs || []);
    scrollToBottom();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const msg = newMessage;
    setNewMessage('');
    // 樂觀更新
    setMessages(prev => [...prev, { id: Date.now().toString(), content: msg, sender_id: user.id, created_at: new Date().toISOString() }]);
    scrollToBottom();

    await supabase.from('messages').insert([{ conversation_id: activeChat.id, sender_id: user.id, content: msg }]);
    await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', activeChat.id);
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
              {conversations.map((conv) => (
                <div key={conv.id} onClick={() => { setActiveChat(conv); loadMessages(conv.id); }}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50 ${activeChat?.id === conv.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-blue-500 font-bold">
                    {conv.otherUser?.avatar_url ? <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover" /> : (conv.otherUser?.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-gray-800 truncate">{conv.otherUser?.name || '會員'}</p>
                    <p className="text-xs text-gray-400">點擊查看訊息</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右邊視窗 */}
          <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
            {loadingChat ? (
              <div className="flex-grow flex items-center justify-center text-gray-500">
                正在連接代購...
              </div>
            ) : activeChat ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button onClick={() => { setActiveChat(null); router.push('/chat'); }} className="md:hidden text-gray-500 mr-2">←</button>
                  <h3 className="font-bold text-gray-800">{activeChat.otherUser?.name}</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 space-y-3">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm break-words ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="輸入訊息..." className="flex-grow p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300">發送</button>
                </form>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center flex-col text-gray-400 bg-gray-50">
                <span className="text-6xl mb-4">💬</span>
                <p>👈 選擇對話</p>
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
    <Suspense fallback={<div className="p-10 text-center">載入聊天室...</div>}>
      <ChatContent />
    </Suspense>
  );
}