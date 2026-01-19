import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconWithBadge } from '@/src/components/NotificationIconWithBadge';
import { useUnreadCount } from '@/components/unread/UnreadCountProvider';

/**
 * ==================================================================================
 * NATIVE TABS LAYOUT
 * ==================================================================================
 * Optimized for performance and stability.
 * Uses standard Expo Router <Tabs> with minimal JS thread blocking.
 */

// Memoized Icon Component to prevent re-renders
const TabBarIcon = React.memo(({ name, color, size = 24 }: { name: keyof typeof Ionicons.glyphMap; color: string; size?: number }) => {
  return <Ionicons name={name} size={size} color={color} style={{ marginBottom: -3 }} />;
});

// Notifications Icon with Dot
const NotificationIcon = React.memo(({ color, showDot }: { color: string; showDot: boolean }) => (
  <View style={styles.iconContainer}>
    <TabBarIcon name="notifications-outline" color={color} />
    {showDot && <View style={styles.redDot} />}
  </View>
));

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { unreadCount: messagesCount, unreadNotificationsCount } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF7A00', // Brand Orange
        tabBarInactiveTintColor: '#999999', // Grey
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEEEEE',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60, // Ensure enough heigh for safe area
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0, // Remove Android shadow if using border
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}>
      {/* Hidden Index - Prevent it from showing up as a tab */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* 5 Allowed Tabs */}
      <Tabs.Screen
        name="wishes"
        options={{
          title: '需求',
          tabBarIcon: ({ color }) => <TabBarIcon name="gift-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: '行程',
          tabBarIcon: ({ color }) => <TabBarIcon name="airplane-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color }) => (
            <NotificationIcon color={color} showDot={unreadNotificationsCount > 0} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '訊息',
          tabBarIcon: ({ color }) => (
            <IconWithBadge
              icon={<TabBarIcon name="chatbubbles-outline" color={color} />}
              count={messagesCount}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
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
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
