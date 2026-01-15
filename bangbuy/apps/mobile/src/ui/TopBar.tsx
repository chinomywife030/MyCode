import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/src/theme/tokens';
import { type Mode } from './ModeToggle';
import { UserAvatar } from '@/src/components/UserAvatar';

interface TopBarProps {
  onMenuPress?: () => void;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string | null;
  mode?: Mode; // 模式：'shopper' (代購) 或 'buyer' (買家)
  showBell?: boolean; // 是否顯示通知鈴鐺，預設為 false（底部 Tab 已有通知入口）
}

/**
 * 頂部導航欄：左側 hamburger/Logo 區、右側 avatar（可選：通知鈴鐺）
 */
export function TopBar({ onMenuPress, onBellPress, onAvatarPress, userEmail, userName, userAvatarUrl, mode, showBell = false }: TopBarProps) {
  // ✅ 使用 useRouter hook 取得 router 實例，避免 Release 模式下 router 是 undefined
  const router = useRouter();
  
  console.count('HEADER_RENDER');
  
  // 根據模式動態設定 Logo 顏色
  // shopper (代購模式) = 品牌橘色，buyer (買家模式) = 藍色
  const logoColor = mode === 'buyer' ? '#007AFF' : colors.brandOrange;
  
  return (
    <View style={styles.container}>
      {/* 左側：Logo 或 Hamburger */}
      <TouchableOpacity
        style={styles.leftSection}
        onPress={onMenuPress || (() => router.push('/'))}
        activeOpacity={0.7}
      >
        <Text style={[styles.logo, { color: logoColor }]}>BangBuy 幫買</Text>
      </TouchableOpacity>

      {/* 右側：頭像（可選：通知鈴鐺） */}
      <View style={styles.rightSection}>
        {userEmail || userName ? (
          <UserAvatar
            avatarUrl={userAvatarUrl}
            name={userName}
            email={userEmail}
            size={32}
            onPress={onAvatarPress || (() => router.push('/login'))}
          />
        ) : (
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onAvatarPress || (() => router.push('/login'))}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={32} color={colors.textMuted} />
          </TouchableOpacity>
        )}
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
    // 顏色由 props.mode 動態設定，這裡設為預設值（代購模式）
    color: colors.brandOrange,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    padding: spacing.xs,
  },
});





