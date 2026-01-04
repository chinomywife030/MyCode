import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/src/theme/tokens';

interface TopBarProps {
  onMenuPress?: () => void;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  userEmail?: string;
}

/**
 * 頂部導航欄：左側 hamburger/Logo 區、右側 bell + avatar
 */
export function TopBar({ onMenuPress, onBellPress, onAvatarPress, userEmail }: TopBarProps) {
  console.count('HEADER_RENDER');
  return (
    <View style={styles.container}>
      {/* 左側：Logo 或 Hamburger */}
      <TouchableOpacity
        style={styles.leftSection}
        onPress={onMenuPress || (() => router.push('/'))}
        activeOpacity={0.7}
      >
        <Text style={styles.logo}>BangBuy</Text>
      </TouchableOpacity>

      {/* 右側：通知 + 頭像 */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBellPress || (() => {})}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onAvatarPress || (() => router.push('/login'))}
          activeOpacity={0.7}
        >
          {userEmail ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userEmail.charAt(0).toUpperCase()}</Text>
            </View>
          ) : (
            <Ionicons name="person-circle-outline" size={32} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.brandOrange,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.xs,
  },
  avatarButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});





