import { StyleSheet, View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '@/src/theme/tokens';

interface SearchRowProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
}

/**
 * 搜尋框 + 篩選按鈕
 */
export function SearchRow({
  placeholder = '搜尋需求...',
  value,
  onChangeText,
  onFilterPress,
}: SearchRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          editable={true}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <TouchableOpacity style={styles.filterButton} onPress={onFilterPress} activeOpacity={0.7}>
        <Ionicons name="options-outline" size={18} color={colors.text} />
        <Text style={styles.filterButtonText}>篩選</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // 淡灰底
    borderRadius: 8, // 圆角
    paddingHorizontal: spacing.md,
    borderWidth: 0, // 无边框
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  filterButton: {
    minWidth: 80,
    height: 40,
    backgroundColor: '#FFFFFF', // 白底
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB', // 淡边框
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
});

