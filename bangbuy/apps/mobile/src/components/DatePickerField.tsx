/**
 * 日期選擇器組件
 * 使用 React Native 的日期選擇器
 */

import React, { useState } from 'react';
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

interface DatePickerFieldProps {
  value?: string; // ISO date string (YYYY-MM-DD)
  onValueChange: (date: string | undefined) => void;
  label?: string;
  required?: boolean;
  error?: string;
  minimumDate?: Date;
  editable?: boolean;
}

export function DatePickerField({
  value,
  onValueChange,
  label = '日期',
  required = false,
  error,
  minimumDate,
  editable = true,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        const dateStr = selectedDate.toISOString().split('T')[0];
        onValueChange(dateStr);
      }
    } else if (event.type === 'dismissed') {
      // Android: 用户取消
      setShowPicker(false);
    }
  };

  const handleConfirm = () => {
    const dateStr = tempDate.toISOString().split('T')[0];
    onValueChange(dateStr);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempDate(value ? new Date(value) : new Date());
  };

  const displayDate = value
    ? new Date(value).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '請選擇日期';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.picker, error && styles.pickerError, !editable && styles.pickerDisabled]}
        onPress={() => editable && setShowPicker(true)}
        activeOpacity={editable ? 0.7 : 1}
        disabled={!editable}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} style={styles.icon} />
        <Text style={[styles.pickerText, !value && styles.pickerPlaceholder]}>
          {displayDate}
        </Text>
        {editable && (
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {Platform.OS === 'ios' && showPicker && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.modalButton}>取消</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>選擇日期</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={[styles.modalButton, styles.modalButtonConfirm]}>確定</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate || new Date()}
                locale="zh-TW"
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate || new Date()}
        />
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
  required: {
    color: colors.error,
  },
  picker: {
    height: 50,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerError: {
    borderColor: colors.error,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: spacing.sm,
  },
  pickerText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalButton: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  modalButtonConfirm: {
    color: colors.brandOrange,
    fontWeight: fontWeight.semibold,
  },
});


