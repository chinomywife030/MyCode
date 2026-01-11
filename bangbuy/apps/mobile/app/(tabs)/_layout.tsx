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
