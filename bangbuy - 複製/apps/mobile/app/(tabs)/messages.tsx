import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Screen, Card, Button, StateView } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCurrentUser } from '@/src/lib/auth';
import { useMessagesUnreadCount } from '@/src/hooks/useMessagesUnreadCount';

// 模擬對話資料類型
interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  sourceType?: 'wish_request' | 'trip' | 'direct';
  sourceTitle?: string;
}

export default function MessagesScreen() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 取得未讀訊息數控制
  const { refresh: refreshMessagesUnreadCount } = useMessagesUnreadCount();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchConversations();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('[MessagesScreen] loadUser error:', err);
      setLoading(false);
    }
  };

  const fetchConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { getConversations } = await import('@/src/lib/messaging');
      const data = await getConversations();
      
      const mappedConversations = data.map((conv) => ({
        id: conv.id,
        partnerId: conv.otherUserId,
        partnerName: conv.otherUserName || '匿名用戶',
        partnerAvatar: conv.otherUserAvatar,
        lastMessage: conv.lastMessagePreview || '尚無訊息',
        lastMessageTime: conv.lastMessageAt || conv.createdAt || new Date().toISOString(),
        unreadCount: conv.unreadCount || 0,
        sourceType: conv.sourceType,
        sourceTitle: conv.sourceTitle,
      }));
      
      setConversations(mappedConversations);
      
      // 更新未讀訊息數（從 conversations 計算）
      // 這會觸發 useMessagesUnreadCount 的 refresh，但我們直接從這裡計算更準確
      const { syncMessagesUnreadCountFromConversations } = await import('@/src/lib/messages/unread');
      await syncMessagesUnreadCountFromConversations(mappedConversations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗';
      setError(errorMessage);
      console.error('[MessagesScreen] fetchConversations error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchConversations(true);
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.id}` as any);
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      {item.partnerAvatar ? (
        <Image source={{ uri: item.partnerAvatar }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.partnerName ? item.partnerName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      )}
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.partnerName} numberOfLines={1}>
            {item.partnerName}
          </Text>
          <Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        {item.sourceTitle && (
          <Text style={styles.sourceTitle} numberOfLines={1}>
            {item.sourceType === 'wish_request' ? '📦 ' : '✈️ '}
            {item.sourceTitle}
          </Text>
        )}
        <View style={styles.conversationFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // 未登入狀態
  if (!loading && !user) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>訊息</Text>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
          <Text style={styles.guestTitle}>登入後查看訊息</Text>
          <Text style={styles.guestSubtitle}>與買家、代購夥伴即時溝通</Text>
          <Button
            title="立即登入"
            onPress={() => router.push('/login')}
            variant="primary"
            size="lg"
          />
        </View>
      </Screen>
    );
  }

  // 載入中
  if (loading) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>訊息</Text>
        </View>
        <StateView type="loading" message="載入訊息中..." />
      </Screen>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>訊息</Text>
        </View>
        <StateView type="error" message={error} onRetry={() => fetchConversations()} />
      </Screen>
    );
  }

  // 空狀態
  if (conversations.length === 0) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>訊息</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>尚無訊息</Text>
          <Text style={styles.emptySubtitle}>
            瀏覽需求或行程，開始與其他用戶對話
          </Text>
          <Button
            title="瀏覽需求"
            onPress={() => router.push('/')}
            variant="primary"
            size="md"
            style={styles.browseButton}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>訊息</Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  partnerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sourceTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: colors.brandOrange,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.lg + 52 + spacing.md,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  guestTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  guestSubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  browseButton: {
    minWidth: 160,
  },
});

