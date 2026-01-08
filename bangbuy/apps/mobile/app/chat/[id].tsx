import { StyleSheet, View, Text, FlatList, KeyboardAvoidingView, Platform, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/src/ui';
import { colors, spacing } from '@/src/theme/tokens';
import { getMessages, sendMessage, markAsRead, type Message } from '@/src/lib/messaging';
import { getCurrentUser } from '@/src/lib/auth';
import { supabase } from '@/src/lib/supabase';
import { ChatHeader } from '@/src/components/chat/ChatHeader';
import { SystemNoticeCard } from '@/src/components/chat/SystemNoticeCard';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { ChatInputBar } from '@/src/components/chat/ChatInputBar';

/**
 * 檢查字串是否為合法的 UUID 格式
 */
function isUUID(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  // UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

export default function ChatScreen() {
  const { id, chatId } = useLocalSearchParams<{ id?: string; chatId?: string }>();
  // 支援 id 或 chatId 參數（向後兼容）
  const conversationId = chatId || id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (conversationId) {
      // UUID 驗證：確保 conversationId 是合法的 UUID
      if (!isUUID(conversationId)) {
        console.error('[ChatScreen] Invalid conversationId (not a valid UUID):', conversationId);
        setError(`無效的對話 ID：${conversationId}`);
        setLoading(false);
        return;
      }
      loadUser();
      fetchMessages();
    }
  }, [conversationId]);

  // 智能滚动：只在用户接近底部时自动滚动
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current && shouldAutoScroll) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, shouldAutoScroll]);

  // 进入聊天室时滚动到底部
  useEffect(() => {
    if (messages.length > 0 && !loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        setIsNearBottom(true);
        setShouldAutoScroll(true);
      }, 300);
    }
  }, [loading]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(conversationId as string);
      setMessages(data);

      // 標記為已讀
      await markAsRead(conversationId as string);

      // 從 conversation 獲取對方用戶資訊
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('user1_id, user2_id')
          .eq('id', conversationId)
          .single();

        if (conv) {
          const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', otherUserId)
            .single();

          if (profile) {
            setOtherUser({
              id: otherUserId,
              name: profile.name || '匿名用戶',
              avatar: profile.avatar_url || undefined,
            });
          } else {
            // 如果沒有 profile，從訊息中獲取
            const otherMessage = data.find((m) => m.senderId !== currentUser.id);
            if (otherMessage) {
              setOtherUser({
                id: otherUserId,
                name: otherMessage.senderName || '匿名用戶',
                avatar: otherMessage.senderAvatar,
              });
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入訊息失敗';
      setError(errorMessage);
      console.error('[ChatScreen] fetchMessages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await sendMessage({
        conversationId: conversationId as string,
        content,
      });

      if (!result.success) {
        const errorMsg = result.error || '無法發送訊息';
        console.error('[ChatScreen] handleSend failed:', {
          error: result.error,
          conversationId: conversationId,
          content: content.substring(0, 50) + '...',
        });
        Alert.alert('發送失敗', errorMsg);
        setInputText(content); // 恢復輸入內容
      } else {
        // 重新載入訊息列表
        await fetchMessages();
        // 發送成功後自動滾動到底部
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      }
    } catch (err: any) {
      console.error('[ChatScreen] handleSend exception:', {
        message: err.message,
        stack: err.stack,
        error: err,
      });
      Alert.alert('錯誤', err.message || '發送訊息失敗');
      setInputText(content); // 恢復輸入內容
    } finally {
      setSending(false);
    }
  };

  // 檢查是否接近底部
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 120;
    const isNear = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsNearBottom(isNear);
    setShouldAutoScroll(isNear);
  }, []);

  // 當列表內容大小改變時，如果接近底部則自動滾動
  const handleContentSizeChange = useCallback(() => {
    if (isNearBottom && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isNearBottom]);

  const formatTime = useCallback((timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return '剛剛';
      if (diffMins < 60) return `${diffMins}分鐘前`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小時前`;
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  // 判斷是否顯示時間（不同人、間隔較久、或第一則）
  const shouldShowTime = useCallback((current: Message, index: number, prev?: Message) => {
    if (index === 0) return true;
    if (!prev) return true;
    
    // 不同人
    if (current.senderId !== prev.senderId) return true;
    
    // 間隔超過 5 分鐘
    const currentTime = new Date(current.createdAt).getTime();
    const prevTime = new Date(prev.createdAt).getTime();
    const diffMins = (currentTime - prevTime) / 60000;
    if (diffMins > 5) return true;
    
    return false;
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderId === user?.id;
    const prevMessage = index > 0 ? messages[index - 1] : undefined;
    const showTime = shouldShowTime(item, index, prevMessage);
    
    // 計算間距：同一人連續訊息間距較小
    const isSameSender = prevMessage && prevMessage.senderId === item.senderId;
    const marginTop = isSameSender ? 4 : 12;

    return (
      <View style={[styles.messageWrapper, { marginTop }]}>
        <MessageBubble
          message={item}
          isMine={isMine}
          showTime={showTime}
          formatTime={formatTime}
        />
      </View>
    );
  }, [user?.id, messages, shouldShowTime, formatTime]);

  if (loading && messages.length === 0) {
    return (
      <Screen style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ChatHeader otherUserName="聊天" />
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error && messages.length === 0) {
    return (
      <Screen style={styles.screen}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ChatHeader otherUserName="聊天" />
        </SafeAreaView>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryButtonText}>重試</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ChatHeader
          otherUserName={otherUser?.name || '對方'}
          otherUserAvatar={otherUser?.avatar}
        />
      </SafeAreaView>
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          onContentSizeChange={handleContentSizeChange}
          ListHeaderComponent={<SystemNoticeCard />}
        />

        <SafeAreaView edges={['bottom']}>
          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            disabled={!conversationId}
            sending={sending}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  messageWrapper: {
    width: '100%',
  },
});

