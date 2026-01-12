import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { colors, radius } from '@/src/theme/tokens';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  onPress?: () => void;
}

/**
 * 使用者頭像元件
 * - 若有 avatarUrl，顯示圖片
 * - 若沒有，顯示圓形背景 + 首字母（從 name 或 email 取得）
 * - 支援圖片載入失敗自動 fallback
 */
export function UserAvatar({
  avatarUrl,
  name,
  email,
  size = 32,
  onPress,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // 取得顯示用的首字母
  const getInitial = (): string => {
    if (name && name.trim()) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (email && email.trim()) {
      return email.trim().charAt(0).toUpperCase();
    }
    return '?';
  };

  const initial = getInitial();
  const hasAvatar = avatarUrl && avatarUrl.trim() && !imageError;

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const content = (
    <>
      {hasAvatar ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={[styles.image, avatarStyle]}
          resizeMode="cover"
          onError={() => {
            console.warn('[UserAvatar] Image load error, falling back to initial');
            setImageError(true);
          }}
        />
      ) : (
        <View style={[styles.placeholder, avatarStyle, { backgroundColor: colors.brandOrange }]}>
          <Text style={[styles.initial, { fontSize: size * 0.44 }]}>
            {initial}
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View>{content}</View>;
}

const styles = StyleSheet.create({
  image: {
    // 尺寸由 props 動態設定
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
