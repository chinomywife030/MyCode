import React, { memo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, fontSize } from '@/src/theme/tokens';
import type { Message } from '@/src/lib/messaging';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showTime: boolean;
  formatTime: (timeString: string) => string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  showTime,
  formatTime,
}: MessageBubbleProps) {
  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.text, isMine && styles.textMine]}>
          {message.content}
        </Text>
      </View>
      {showTime && (
        <View style={[styles.timeContainer, isMine && styles.timeContainerMine]}>
          <Text style={[styles.time, isMine && styles.timeMine]}>
            {formatTime(message.createdAt || message.created_at)}
          </Text>
          {isMine && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    marginBottom: 4,
  },
  containerMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: fontSize.base,
    lineHeight: 20,
    color: colors.text,
  },
  textMine: {
    color: '#ffffff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeContainerMine: {
    justifyContent: 'flex-end',
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
  timeMine: {
    color: colors.textMuted,
  },
  checkmark: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
});

