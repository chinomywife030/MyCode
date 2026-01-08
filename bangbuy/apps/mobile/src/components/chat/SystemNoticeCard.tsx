import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '@/src/theme/tokens';

export function SystemNoticeCard() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#DC2626" style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            安全提醒：請勿向陌生人轉帳或提供付款資訊。本平台不介入金流與交易糾紛（見〈免責聲明〉）。
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setIsVisible(false)}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    color: '#991B1B',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
});


