import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { colors } from '@/src/theme/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // 根據主題選擇活躍色
  const activeTintColor = colorScheme === 'dark' ? colors.brandOrangeLight : colors.brandOrange;
  const inactiveTintColor = colorScheme === 'dark' ? '#9ca3af' : colors.textMuted;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1f2937' : colors.bgCard,
          borderTopColor: colorScheme === 'dark' ? '#374151' : colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '訊息',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
      {/* 保留 wishes 和 trips 作為隱藏路由（不顯示在 tab bar） */}
      <Tabs.Screen
        name="wishes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
