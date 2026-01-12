import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

interface SegmentedControlProps {
  segments: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

/**
 * Segmented Control 組件
 * 用於在兩個或多個選項間切換
 */
export function SegmentedControl({
  segments,
  selectedValue,
  onValueChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        const isSelected = segment.value === selectedValue;
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;

        return (
          <TouchableOpacity
            key={segment.value}
            style={[
              styles.segment,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
              isSelected && styles.segmentSelected,
            ]}
            onPress={() => onValueChange(segment.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentFirst: {
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
  },
  segmentLast: {
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.bgCard,
    ...shadows.sm,
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  segmentTextSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});







