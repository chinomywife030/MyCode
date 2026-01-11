import { StyleSheet, FlatList, RefreshControl, View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar, Card, StateView, Button } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '@/src/lib/notifications';
import { getCurrentUser } from '@/src/lib/auth';
import { handleNotificationPress } from '@/src/lib/notifications/navigation';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[NotificationsScreen] fetchNotifications error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleRefresh = () => {
    fetchNotifications(true);
  };

  const handleRetry = () => {
    fetchNotifications();
  };

  const handleNotificationItemPress = async (notification: Notification) => {
    // 標記為已讀（失敗不影響跳頁）
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        // 更新本地狀態
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
      } catch (err) {
        console.error('[NotificationsScreen] markAsRead error:', err);
        // 失敗不影響跳頁，繼續執行
      }
    }

    // 使用共用的導頁函數
    const success = await handleNotificationPress(notification, router);
    if (!success) {
      console.warn('[NotificationsScreen] Failed to navigate for notification:', notification.id);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error('[NotificationsScreen] markAllRead error:', err);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return '剛剛';
      } else if (diffMins < 60) {
        return `${diffMins} 分鐘前`;
      } else if (diffHours < 24) {
        return `${diffHours} 小時前`;
      } else if (diffDays < 7) {
        return `${diffDays} 天前`;
      } else {
        return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_REPLY':
        return 'chatbubble-ellipses-outline';
      case 'NEW_MESSAGE':
        return 'mail-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.notificationItemUnread]}
      onPress={() => handleNotificationItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, !item.is_read && styles.iconContainerUnread]}>
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={20}
            color={item.is_read ? colors.textMuted : colors.brandOrange}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !item.is_read && styles.titleUnread]}>
            {item.title}
          </Text>
          {item.body && (
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          )}
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  // 未登入狀態
  if (!loading && !user) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>通知</Text>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="notifications-outline" size={64} color={colors.textMuted} />
          <Text style={styles.guestTitle}>登入後查看通知</Text>
          <Text style={styles.guestSubtitle}>即時接收回覆、訊息等通知</Text>
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
          <Text style={styles.headerTitle}>通知</Text>
        </View>
        <StateView type="loading" message="載入通知中..." />
      </Screen>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>通知</Text>
        </View>
        <StateView type="error" message={error} onRetry={handleRetry} />
      </Screen>
    );
  }

  // 空狀態
  if (notifications.length === 0) {
    return (
      <Screen>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>通知</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>尚無通知</Text>
          <Text style={styles.emptySubtitle}>當有新的回覆或訊息時，會在這裡顯示</Text>
        </View>
      </Screen>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Screen>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>通知</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllReadButton}>
            <Text style={styles.markAllReadText}>全部標記已讀</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        renderItem={renderItem}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  markAllReadButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  markAllReadText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  notificationItem: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  notificationItemUnread: {
    backgroundColor: '#fff9f0', // 淺橘背景
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerUnread: {
    backgroundColor: '#fff4e6', // 淺橘背景
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  titleUnread: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: fontSize.sm * 1.4,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandOrange,
    marginLeft: spacing.sm,
    marginTop: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.lg + 40 + spacing.md,
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
  },
});




