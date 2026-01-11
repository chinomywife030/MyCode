import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { colors } from '@/src/theme/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 简单的 TabBarIcon 包装器
function TabBarIcon({ name, color, size = 24 }: { name: keyof typeof Ionicons.glyphMap; color: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

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
          tabBarIcon: ({ color }) => <TabBarIcon name="notifications-outline" color={color} />,
        }}
      />

      {/* 3. Messages Tab */}
      <Tabs.Screen
        name="messages"
        options={{
          title: '訊息',
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbubbles-outline" color={color} />,
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
