import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, TopBar } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { getMessages, sendMessage, markAsRead, getConversations, type Message } from '@/src/lib/messaging';
import { getCurrentUser } from '@/src/lib/auth';
import { supabase } from '@/src/lib/supabase';

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

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // 滾動到底部
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
        // 【必做 1：顯示完整錯誤訊息】
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
      }
    } catch (err: any) {
      // 【必做 1：顯示完整錯誤訊息】
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

  const formatTime = (timeString: string) => {
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
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.senderName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          {!isMe && <Text style={styles.senderName}>{item.senderName || '匿名用戶'}</Text>}
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.content}</Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <Screen>
        <TopBar title="聊天" showBackButton />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error && messages.length === 0) {
    return (
      <Screen>
        <TopBar title="聊天" showBackButton />
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
    <Screen>
      <TopBar
        title={otherUser?.name || '聊天'}
        showBackButton
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="輸入訊息..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <Text style={styles.sendButtonText}>發送中...</Text>
            ) : (
              <Ionicons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  messageBubbleMe: {
    backgroundColor: colors.brandOrange,
  },
  messageBubbleOther: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  senderName: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  messageText: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.text,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
  },
});

