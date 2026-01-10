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
  // 格式化時間為簡短格式（用於氣泡內顯示）
  const formatBubbleTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.text, isMine && styles.textMine]}>
          {message.content}
        </Text>
        {/* 時間顯示在氣泡內部右下角 */}
        <View style={styles.timeContainer}>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {formatBubbleTime(message.createdAt || message.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    marginBottom: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
  },
  // 我發送的訊息：經典藍色，右下角稍微尖一點
  bubbleMine: {
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4, // 右下角尖一點
  },
  // 對方發送的訊息：淺灰色，左上角稍微尖一點
  bubbleOther: {
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 4, // 左上角尖一點
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  text: {
    fontSize: fontSize.base,
    lineHeight: 22, // 增加行高提升閱讀舒適度
    color: '#000000',
    marginBottom: 2, // 與時間的間距
  },
  textMine: {
    color: '#FFFFFF',
  },
  timeContainer: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)', // 半透明黑色
    lineHeight: 12,
  },
  bubbleTimeMine: {
    color: 'rgba(255, 255, 255, 0.7)', // 半透明白色
  },
});

