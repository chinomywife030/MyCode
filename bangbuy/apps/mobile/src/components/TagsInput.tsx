/**
 * 標籤輸入組件
 * 支援逗號分隔輸入，顯示為 chips 可刪除
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

interface TagsInputProps {
  value: string[]; // 標籤陣列
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function TagsInput({
  value,
  onChange,
  label = '關鍵字標籤',
  placeholder = '例如：jellycat, selfridges, 限定版',
}: TagsInputProps) {
  const [inputText, setInputText] = useState('');

  const handleAddTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 支援逗號分隔
    const newTags = trimmed
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && !value.includes(tag));

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
      setInputText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmitEditing = () => {
    if (inputText.trim()) {
      handleAddTag(inputText);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {/* 輸入框 */}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={inputText}
        onChangeText={setInputText}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType="done"
      />
      <Text style={styles.hint}>用逗號分隔多個標籤</Text>

      {/* 標籤列表 */}
      {value.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {value.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveTag(tag)}
                style={styles.tagRemove}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    height: 50,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.base,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    paddingRight: spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginRight: spacing.xs,
  },
  tagRemove: {
    marginLeft: spacing.xs,
  },
});


