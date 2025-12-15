'use client';

import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { safeRpc, safeQuery } from '@/lib/safeCall';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ConversationList, ChatRoom } from '@/components/chat';
import { eventBus, Events } from '@/lib/events';
import type { Conversation } from '@/hooks/useConversations';

// 開發模式日誌
const isDev = process.env.NODE_ENV === 'development';
const log = (message: string, data?: any) => {
  if (isDev) {
    console.log(`[chat] ${message}`, data || '');
  }
};

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL 參數
  const targetId = searchParams.get('target');
  const conversationParam = searchParams.get('conversation'); // 支援直接跳轉到對話
  const sourceType = searchParams.get('source_type') || 'direct';
  const sourceId = searchParams.get('source_id') || null;
  const sourceTitle = searchParams.get('source_title') || null;

  // 計算唯一的 conversation key（用於觸發重新載入）
  const conversationKey = useMemo(() => {
    if (conversationParam) return `conv:${conversationParam}`;
    if (targetId) return `target:${targetId}:${sourceType}:${sourceId || 'null'}`;
    return null;
  }, [conversationParam, targetId, sourceType, sourceId]);

  // 狀態
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    otherUser: { id: string; name: string | null; avatar_url: string | null };
    sourceType?: string;
    sourceId?: string | null;
    sourceTitle?: string | null;
    isBlocked?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  // 防止重複初始化（用 conversationKey 作為 key）
  const inFlightKeyRef = useRef<string | null>(null);
  const currentUserRef = useRef<{ id: string } | null>(null);

  // 檢舉 Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // 驗證 targetId
  const isValidTarget = (id: string | null): boolean => {
    if (!id) return false;
    if (id === '00000000-0000-0000-0000-000000000000') return false;
    if (id.startsWith('11111111') || id.startsWith('22222222')) return false;
    if (id === 'null' || id === 'undefined') return false;
    if (id.length < 10) return false;
    return true;
  };

  // 載入對話（核心函數）
  const loadConversation = useCallback(async (key: string | null) => {
    // 並發鎖：避免同一個 key 重複載入
    if (inFlightKeyRef.current === key) {
      log('Already loading this conversation, skipping...', key);
      return;
    }

    inFlightKeyRef.current = key;
    setLoading(true);
    setError(null);

    try {
      // 先確認用戶
      let user = currentUserRef.current;
      
      if (!user) {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          router.push('/login');
          return;
        }
        
        user = { id: authUser.id };
        currentUserRef.current = user;
        setCurrentUser(user);
      }

      log('Loading conversation', { key, conversationParam, targetId });

      // 如果有 conversation 參數，直接打開該對話
      if (conversationParam) {
        await handleOpenConversation(conversationParam);
      }
      // 如果有 target 參數，使用 RPC 獲取或創建對話
      else if (isValidTarget(targetId)) {
        await handleGetOrCreateConversation(user.id, targetId!);
      } else {
        // 沒有參數，只顯示列表
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[ChatPage] loadConversation error:', err);
      setError('載入失敗，請重新整理頁面');
      setLoading(false);
    } finally {
      inFlightKeyRef.current = null;
    }
  }, [conversationParam, targetId, router]);

  // 初始化 + 依賴 URL 參數變化重新載入
  useEffect(() => {
    log('conversationKey changed', conversationKey);
    loadConversation(conversationKey);
  }, [conversationKey, loadConversation]);

  // 監聽 EventBus 的 CHAT_OPEN 事件
  useEffect(() => {
    const unsubscribe = eventBus.on(Events.CHAT_OPEN, (convId: string) => {
      log('CHAT_OPEN event received', convId);
      handleOpenConversation(convId);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 使用 RPC 獲取或創建對話（防止重複創建）
  const handleGetOrCreateConversation = useCallback(async (myId: string, targetUserId: string) => {
    if (!targetUserId || targetUserId === myId) {
      setLoading(false);
      return;
    }

    log('handleGetOrCreateConversation', { myId, targetUserId });

    try {
      // 1. 獲取目標用戶資料
      const { data: targetUser, error: profileError } = await safeQuery(
        () => supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', targetUserId)
          .single(),
        'getTargetProfile'
      );
      
      if (!targetUser || profileError) {
        console.error('[handleGetOrCreateConversation] Target user not found');
        setError('找不到該用戶');
        setLoading(false);
        return;
      }

      // 2. 使用 RPC 獲取或創建對話（DB 層保證唯一性）
      const { data: rpcResult, error: rpcError } = await safeRpc('get_or_create_conversation', {
        p_target: targetUserId,
        p_source_type: sourceType || 'direct',
        p_source_id: sourceId || null,
        p_source_title: sourceTitle || null,
      });

      if (rpcError) {
        console.error('[handleGetOrCreateConversation] RPC error:', rpcError);
        throw rpcError;
      }

      const conversationId = rpcResult?.[0]?.conversation_id;

      if (!conversationId) {
        setError('無法建立對話');
        setLoading(false);
        return;
      }

      log('Conversation loaded/created', conversationId);

      // 成功！
      setActiveConversation({
        id: conversationId,
        otherUser: targetUser,
        sourceType: sourceType,
        sourceId: sourceId,
        sourceTitle: sourceTitle,
        isBlocked: false,
      });
      setShowMobileList(false);
      setLoading(false);

      // 清除 URL 參數，避免刷新時重複處理
      router.replace('/chat', { scroll: false });

      // 觸發對話列表刷新
      eventBus.emit(Events.CONVERSATIONS_REFRESH);

    } catch (err: any) {
      console.error('[handleGetOrCreateConversation] Error:', err);
      setError(err.message || '發生錯誤');
      setLoading(false);
    }
  }, [sourceType, sourceId, sourceTitle, router]);

  // 直接打開現有對話
  const handleOpenConversation = useCallback(async (convId: string) => {
    log('handleOpenConversation', convId);
    setLoading(true);

    try {
      // 獲取對話資料
      const { data: conv, error: convError } = await safeQuery(
        () => supabase
          .from('conversations')
          .select('id, user1_id, user2_id, source_type, source_id, source_title')
          .eq('id', convId)
          .single(),
        'getConversation'
      );

      if (!conv || convError) {
        setError('找不到該對話');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 確定對方 ID
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      // 獲取對方資料
      const { data: otherUser } = await safeQuery(
        () => supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', otherId)
          .single(),
        'getOtherProfile'
      );

      log('Conversation opened', { convId, otherId });

      setActiveConversation({
        id: conv.id,
        otherUser: otherUser || { id: otherId, name: null, avatar_url: null },
        sourceType: conv.source_type || undefined,
        sourceId: conv.source_id,
        sourceTitle: conv.source_title,
        isBlocked: false,
      });
      setShowMobileList(false);

      // 觸發訊息刷新事件
      eventBus.emit(Events.MESSAGES_REFRESH, convId);

    } catch (err: any) {
      console.error('[handleOpenConversation] Error:', err);
      setError(err.message || '發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // 選擇對話（從列表）
  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', conversation.other_user_id)
      .single();

    setActiveConversation({
      id: conversation.id,
      otherUser: otherUser || { 
        id: conversation.other_user_id, 
        name: conversation.other_user_name, 
        avatar_url: conversation.other_user_avatar 
      },
      sourceType: conversation.source_type || undefined,
      sourceId: conversation.source_id,
      sourceTitle: conversation.source_title,
      isBlocked: conversation.is_blocked,
    });
    setShowMobileList(false);
  }, []);

  // 封鎖用戶
  const handleBlock = async () => {
    if (!activeConversation) return;

    const confirmed = confirm(
      activeConversation.isBlocked 
        ? '確定要解除封鎖此用戶嗎？' 
        : '確定要封鎖此用戶嗎？封鎖後將無法互相發送訊息。'
    );

    if (!confirmed) return;

    try {
      if (activeConversation.isBlocked) {
        await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', currentUser?.id)
          .eq('blocked_id', activeConversation.otherUser.id);
        
        setActiveConversation(prev => prev ? { ...prev, isBlocked: false } : null);
        alert('已解除封鎖');
      } else {
        await supabase
          .from('blocks')
          .insert({
            blocker_id: currentUser?.id,
            blocked_id: activeConversation.otherUser.id,
          });
        
        setActiveConversation(prev => prev ? { ...prev, isBlocked: true } : null);
        alert('已封鎖此用戶');
      }
    } catch (err: any) {
      console.error('[handleBlock] Error:', err);
      alert('操作失敗：' + (err.message || '請稍後再試'));
    }
  };

  // 檢舉用戶
  const handleReport = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!activeConversation || !reportReason || !currentUser) return;

    try {
      await supabase
        .from('reports')
        .insert({
          reporter_id: currentUser.id,
          reported_id: activeConversation.otherUser.id,
          reason: reportReason,
          description: reportDescription || null,
          conversation_id: activeConversation.id,
        });

      alert('檢舉已提交，我們會盡快處理。');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      console.error('[submitReport] Error:', err);
      alert('檢舉失敗：' + (err.message || '請稍後再試'));
    }
  };

  // 渲染
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="text-sm underline mt-2">
              關閉
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          <div className="flex h-full">
            {/* 對話列表 */}
            <div className={`w-full md:w-80 border-r ${showMobileList ? 'block' : 'hidden md:block'}`}>
              <ConversationList
                activeConversationId={activeConversation?.id}
                onSelectConversation={handleSelectConversation}
              />
            </div>

            {/* 聊天室 */}
            <div className={`flex-1 ${!showMobileList ? 'block' : 'hidden md:block'}`}>
              {activeConversation ? (
                <ChatRoom
                  conversationId={activeConversation.id}
                  otherUser={activeConversation.otherUser}
                  sourceType={activeConversation.sourceType}
                  sourceId={activeConversation.sourceId}
                  sourceTitle={activeConversation.sourceTitle}
                  isBlocked={activeConversation.isBlocked}
                  onBack={() => setShowMobileList(true)}
                  onBlock={handleBlock}
                  onReport={handleReport}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-24 h-24 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-medium">選擇一個對話開始聊天</p>
                  <p className="text-sm mt-2">或從願望單/行程頁面發起對話</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 檢舉 Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">檢舉用戶</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                檢舉原因
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">請選擇原因</option>
                <option value="scam">詐騙/可疑交易</option>
                <option value="harassment">騷擾/霸凌</option>
                <option value="fake_goods">假貨/虛假資訊</option>
                <option value="personal_info">散布個資</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                補充說明（選填）
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="請描述發生了什麼事..."
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
              >
                提交檢舉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
