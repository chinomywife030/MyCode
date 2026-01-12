/**
 * 共用日期選擇元件
 * 解決 DatePicker 白板/日期不可見問題
 * 支援 iOS/Android，統一使用 Modal 顯示
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';

interface DateFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string;
  editable?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  required = false,
  minimumDate,
  maximumDate,
  placeholder = '請選擇日期',
  error,
  editable = true,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  // 當外部 value 改變時，同步 tempDate
  useEffect(() => {
    if (value) {
      setTempDate(value);
    } else {
      setTempDate(new Date());
    }
  }, [value]);

  const handleOpen = () => {
    if (!editable) return;
    // 打開時，如果沒有值，使用今天或 minimumDate
    if (!value) {
      setTempDate(minimumDate || new Date());
    } else {
      setTempDate(value);
    }
    setShowPicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android：選完即 commit（即使使用 Modal，也保持原生行為）
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
        setShowPicker(false);
      } else if (event.type === 'dismissed') {
        // 用戶取消
        setShowPicker(false);
      }
    } else {
      // iOS：只更新 tempDate，不 commit（需要點「確定」）
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    // 恢復到原始值
    setTempDate(value || new Date());
    setShowPicker(false);
  };

  const displayDate = value
    ? value.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : placeholder;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.input,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        onPress={handleOpen}
        activeOpacity={editable ? 0.7 : 1}
        disabled={!editable}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={value ? colors.text : colors.textMuted}
          style={styles.icon}
        />
        <Text
          style={[
            styles.inputText,
            !value && styles.inputPlaceholder,
          ]}
        >
          {displayDate}
        </Text>
        {editable && (
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.textMuted}
          />
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS/Android 統一使用 Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCancel}
          />
          <View style={styles.modalContent}>
            {/* Action Bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.actionBarTitle}>選擇日期</Text>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonConfirm]}>
                  確定
                </Text>
              </TouchableOpacity>
            </View>

            {/* 分隔線 */}
            <View style={styles.separator} />

            {/* Picker 區域 */}
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale={Platform.OS === 'ios' ? 'zh-TW' : undefined}
                textColor={Platform.OS === 'ios' ? colors.text : undefined} // ✅ iOS 確保文字可見
                style={styles.picker}
                themeVariant="light" // ✅ 確保淺色主題
              />
            </View>
          </View>
        </View>
      </Modal>
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
  required: {
    color: colors.error,
  },
  input: {
    height: 50,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: spacing.sm,
  },
  inputText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputPlaceholder: {
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', // ✅ 明確的白色背景
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg, // iOS safe area
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF', // ✅ 明確的白色背景
  },
  actionBarTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  actionButtonConfirm: {
    color: colors.brandOrange,
    fontWeight: fontWeight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  pickerContainer: {
    height: 280, // ✅ 固定高度，確保可見
    backgroundColor: '#FFFFFF', // ✅ 明確的白色背景
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF', // ✅ 明確的白色背景
  },
});

