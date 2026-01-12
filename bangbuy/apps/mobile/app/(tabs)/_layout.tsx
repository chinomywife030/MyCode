import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { colors } from '@/src/theme/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconWithBadge } from '@/src/components/NotificationIconWithBadge';
import { useUnreadCount as useMessagesUnreadCountFromContext } from '@/components/unread/UnreadCountProvider';

// 简单的 TabBarIcon 包装器
function TabBarIcon({ name, color, size = 24 }: { name: keyof typeof Ionicons.glyphMap; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

// 只顯示紅點的圖標組件
function IconWithDot({ icon, showDot }: { icon: React.ReactNode; showDot: boolean }) {
  return (
    <View style={styles.iconContainer}>
      {icon}
      {showDot && <View style={styles.redDot} />}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  // 取得未讀通知數和未讀訊息數（從 Context Provider，即時更新）
  const { unreadCount: messagesUnreadCount, unreadNotificationsCount } = useMessagesUnreadCountFromContext();

  // Tab Bar 顏色設定
  // Active 顏色：固定使用品牌橘（代購模式）
  // 註：目前 mode 狀態在個別頁面管理，Tab Layout 無法存取，因此固定使用品牌橘
  // 未來若需要依身分切換（代購橘 #FF7A00 / 買家藍 #1E78FF），需透過 Context 或全域狀態管理
  const activeTintColor = '#FF7A00'; // 品牌橘
  const inactiveTintColor = '#9CA3AF'; // 灰色

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#F7F7F8', // 灰白色背景
          borderTopColor: '#E5E7EB', // 淺灰邊框
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}>
      {/* 1. Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      {/* 2. Notifications Tab */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color }) => (
            <IconWithDot
              icon={<TabBarIcon name="notifications-outline" color={color} />}
              showDot={unreadNotificationsCount > 0}
            />
          ),
        }}
      />

      {/* 3. Messages Tab */}
      <Tabs.Screen
        name="messages"
        options={{
          title: '訊息',
          tabBarIcon: ({ color }) => (
            <IconWithBadge
              icon={<TabBarIcon name="chatbubbles-outline" color={color} />}
              count={messagesUnreadCount}
              size={24}
            />
          ),
        }}
      />

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />

      {/* 🔴 CRITICAL: Explicitly HIDE everything else that might exist in the folder */}
      <Tabs.Screen name="_trips-page-content" options={{ href: null }} />
      <Tabs.Screen name="_wishes-page-content" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444', // 紅色
    borderWidth: 1.5,
    borderColor: '#FFFFFF', // 白色邊框
  },
});
