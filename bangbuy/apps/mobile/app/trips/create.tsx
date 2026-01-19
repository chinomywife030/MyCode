/**
 * 發布行程/旅途發現頁面
 * 雙模式：行程 (Trip) 和 旅途發現 (Discovery)
 * 
 * 📝 功能說明：
 * - Trip 模式：用戶發布代購行程（我要去哪裡、日期、代購說明）
 * - Discovery 模式：用戶發布「旅途中看到的酷東西」（照片、標題、國家）
 * 
 * ⚠️ 重要：Discovery insert 僅在用戶主動選擇「旅途發現」模式並填寫表單後提交時觸發
 *   不會在沒有 UI 勾選的情況下自動 insert discovery
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCurrentUser } from '@/src/lib/auth';
import { createTrip } from '@/src/lib/trips';
import { DateField } from '@/src/components/DateField';
import { CountryPickerField } from '@/src/components/CountryPickerField';
import { ImagePickerGrid } from '@/src/components/ImagePickerGrid';
import { supabase } from '@/src/lib/supabase';
import { uploadMultipleImages } from '@/src/lib/supabaseUpload';

type Mode = 'trip' | 'discovery';

export default function CreateTripScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('trip');

  // Trip 表單狀態（完全獨立）
  const [tripDestination, setTripDestination] = useState('');
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);
  const [tripDescription, setTripDescription] = useState('');

  // Discovery 表單狀態（完全獨立）
  const [discoveryPhotos, setDiscoveryPhotos] = useState<string[]>([]);
  const [discoveryTitle, setDiscoveryTitle] = useState('');
  const [discoveryCountry, setDiscoveryCountry] = useState<string>('');

  // Trip 驗證錯誤
  const [tripErrors, setTripErrors] = useState<{
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // Discovery 驗證錯誤
  const [discoveryErrors, setDiscoveryErrors] = useState<{
    photos?: string;
    title?: string;
    country?: string;
  }>({});

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      Alert.alert('請先登入', '發布行程需要先登入', [
        { text: '確定', onPress: () => router.back() },
      ]);
      return;
    }
    setUser(currentUser);
  };

  // 檢查表單是否為 "dirty"（有輸入內容）
  const isTripFormDirty = (): boolean => {
    return (
      tripDestination.trim() !== '' ||
      tripStartDate !== null ||
      tripEndDate !== null ||
      tripDescription.trim() !== ''
    );
  };

  const isDiscoveryFormDirty = (): boolean => {
    return (
      discoveryPhotos.length > 0 ||
      discoveryTitle.trim() !== '' ||
      discoveryCountry !== ''
    );
  };

  // 切換模式（帶安全檢查）
  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;

    // 檢查當前表單是否 dirty
    const isDirty = mode === 'trip' ? isTripFormDirty() : isDiscoveryFormDirty();

    if (isDirty) {
      Alert.alert(
        '確認切換',
        '切換後已輸入內容將不會保留，是否繼續？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '確定',
            onPress: () => {
              // 清空當前表單狀態
              if (mode === 'trip') {
                setTripDestination('');
                setTripStartDate(null);
                setTripEndDate(null);
                setTripDescription('');
                setTripErrors({});
              } else {
                setDiscoveryPhotos([]);
                setDiscoveryTitle('');
                setDiscoveryCountry('');
                setDiscoveryErrors({});
              }
              setMode(newMode);
            },
          },
        ]
      );
    } else {
      setMode(newMode);
    }
  };

  // Trip 表單驗證
  const validateTripForm = (): boolean => {
    const newErrors: typeof tripErrors = {};

    if (!tripDestination.trim()) {
      newErrors.destination = '請輸入目的地';
    }

    if (!tripStartDate) {
      newErrors.startDate = '請選擇開始日期';
    }

    if (!tripEndDate) {
      newErrors.endDate = '請選擇結束日期';
    }

    if (tripStartDate && tripEndDate) {
      if (tripEndDate < tripStartDate) {
        newErrors.endDate = '結束日期不得早於開始日期';
      }
    }

    setTripErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Discovery 表單驗證
  const validateDiscoveryForm = (): boolean => {
    const newErrors: typeof discoveryErrors = {};

    if (discoveryPhotos.length === 0) {
      newErrors.photos = '請至少上傳一張圖片';
    }

    if (!discoveryTitle.trim()) {
      newErrors.title = '請輸入標題';
    }

    if (!discoveryCountry) {
      newErrors.country = '請選擇國家';
    }

    setDiscoveryErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Trip 提交
  const handleTripSubmit = async () => {
    if (!user) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    if (!validateTripForm()) {
      return;
    }

    setLoading(true);

    try {
      const formatDateToString = (date: Date | null): string | undefined => {
        if (!date) return undefined;
        return date.toISOString().split('T')[0];
      };

      const result = await createTrip({
        destination: tripDestination.trim(),
        startDate: formatDateToString(tripStartDate),
        endDate: formatDateToString(tripEndDate),
        description: tripDescription.trim() || undefined,
      });

      if (!result.success) {
        Alert.alert('發布失敗', result.error || '請稍後再試');
        setLoading(false);
        return;
      }

      Alert.alert('發布成功', '你的行程已成功發布', [
        {
          text: '確定',
          onPress: () => {
            router.replace('/');
          },
        },
      ]);
    } catch (error: any) {
      console.error('[CreateTripScreen] Trip submit error:', error);
      Alert.alert('錯誤', error.message || '發布失敗，請稍後再試');
      setLoading(false);
    }
  };

  /**
   * Discovery 提交處理
   * 📝 功能意圖：此為「旅途中看到的酷東西」功能
   *    - 用戶在 UI 中通過 Segmented Control 主動選擇「旅途發現」模式
   *    - 填寫表單（照片、標題、國家）後點擊「立即發布」按鈕
   *    - 觸發此函數執行 insert 操作
   * ⚠️ 不會在沒有 UI 勾選的情況下自動 insert discovery
   */
  const handleDiscoverySubmit = async () => {
    // ✅ Auth Session Guard: 在實際呼叫 DB 前驗證 session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      // 未登入或 session 無效，顯示合理 UI 並直接 return（不呼叫 DB）
      Alert.alert('請先登入', '發布旅途發現需要先登入', [
        { text: '確定', onPress: () => router.back() },
      ]);
      return;
    }

    if (!validateDiscoveryForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1. 上傳圖片到 Supabase Storage
      let photoUrls: string[] = [];
      if (discoveryPhotos.length > 0) {
        const uploadResult = await uploadMultipleImages(
          discoveryPhotos,
          'discoveries', // bucket 名稱
          session.user.id // ✅ 使用 session.user.id
        );

        if (!uploadResult.success || !uploadResult.urls) {
          Alert.alert('上傳失敗', uploadResult.error || '圖片上傳失敗，請稍後再試');
          setLoading(false);
          return;
        }

        photoUrls = uploadResult.urls;
      }

      // 2. 插入到 discoveries 表
      // ✅ 必須明確帶入 author_id: session.user.id，確保與 auth.uid() 完全一致
      // 📝 功能說明：此為「旅途中看到的酷東西」功能，用戶在 UI 中主動選擇「旅途發現」模式並填寫表單後提交
      const { data, error } = await supabase.from('discoveries').insert({
        title: discoveryTitle.trim(),
        country: discoveryCountry,
        photos: photoUrls,
        author_id: session.user.id, // ✅ 確保 author_id = session.user.id（與 auth.uid() 完全一致）
      });

      if (error) {
        // ✅ 錯誤處理降級：42501 權限錯誤不 throw，顯示友好提示
        if (error.code === '42501') {
          // console 僅 log 一次（避免 call stack 洗版）
          console.warn('[CreateTripScreen] Discovery insert permission denied (42501)');
          Alert.alert(
            '權限不足',
            '權限不足或登入狀態異常，請重新登入',
            [
              { text: '確定', onPress: () => router.back() },
            ]
          );
          setLoading(false);
          return;
        }
        
        console.error('[CreateTripScreen] Discovery insert error:', error);
        Alert.alert('發布失敗', error.message || '請稍後再試');
        setLoading(false);
        return;
      }

      Alert.alert('發布成功', '你的旅途發現已成功發布', [
        {
          text: '確定',
          onPress: () => {
            router.replace('/');
          },
        },
      ]);
    } catch (error: any) {
      console.error('[CreateTripScreen] Discovery submit error:', error);
      Alert.alert('錯誤', error.message || '發布失敗，請稍後再試');
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'trip') {
      handleTripSubmit();
    } else {
      handleDiscoverySubmit();
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Screen style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'trip' ? '發布我的行程' : '發布旅途發現'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              mode === 'trip' && styles.segmentActive,
            ]}
            onPress={() => handleModeSwitch('trip')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'trip' && styles.segmentTextActive,
              ]}
            >
              行程
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              mode === 'discovery' && styles.segmentActive,
            ]}
            onPress={() => handleModeSwitch('discovery')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'discovery' && styles.segmentTextActive,
              ]}
            >
              旅途發現
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'trip' ? (
            /* Trip Form */
            <>
              {/* 目的地 */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  我要去哪裡？ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    tripErrors.destination && styles.inputError,
                  ]}
                  placeholder="例如：東京, 日本"
                  placeholderTextColor={colors.textMuted}
                  value={tripDestination}
                  onChangeText={(text) => {
                    setTripDestination(text);
                    if (tripErrors.destination) {
                      setTripErrors({ ...tripErrors, destination: undefined });
                    }
                  }}
                  editable={!loading}
                />
                {tripErrors.destination && (
                  <Text style={styles.errorText}>{tripErrors.destination}</Text>
                )}
              </View>

              {/* 開始日期 */}
              <DateField
                label="開始日期"
                value={tripStartDate}
                onChange={(date) => {
                  setTripStartDate(date);
                  if (tripErrors.startDate) {
                    setTripErrors({ ...tripErrors, startDate: undefined });
                  }
                }}
                required
                error={tripErrors.startDate}
                minimumDate={new Date()}
                editable={!loading}
              />

              {/* 結束日期 */}
              <DateField
                label="結束日期"
                value={tripEndDate}
                onChange={(date) => {
                  setTripEndDate(date);
                  if (tripErrors.endDate) {
                    setTripErrors({ ...tripErrors, endDate: undefined });
                  }
                }}
                required
                error={tripErrors.endDate}
                minimumDate={tripStartDate || new Date()}
                editable={!loading}
              />

              {/* 代購說明 */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>代購說明</Text>
                <TextInput
                  style={[styles.textArea, styles.input]}
                  placeholder="例如：可代購藥妝、零食、3C 產品等，歡迎私訊詢問"
                  placeholderTextColor={colors.textMuted}
                  value={tripDescription}
                  onChangeText={setTripDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
                <Text style={styles.hintText}>
                  說明越清楚，越容易吸引需要代購的用戶
                </Text>
              </View>
            </>
          ) : (
            /* Discovery Form */
            <>
              {/* 圖片上傳 */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  照片 <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.hintText}>
                  最多 1 張
                </Text>
                <ImagePickerGrid
                  images={discoveryPhotos}
                  maxImages={1}
                  onImagesChange={(images) => {
                    setDiscoveryPhotos(images);
                    if (discoveryErrors.photos) {
                      setDiscoveryErrors({ ...discoveryErrors, photos: undefined });
                    }
                  }}
                />
                {discoveryErrors.photos && (
                  <Text style={styles.errorText}>{discoveryErrors.photos}</Text>
                )}
              </View>

              {/* 標題 */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  發現了什麼酷東西？ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    discoveryErrors.title && styles.inputError,
                  ]}
                  placeholder="例如：大阪環球影城限定爆米花桶"
                  placeholderTextColor={colors.textMuted}
                  value={discoveryTitle}
                  onChangeText={(text) => {
                    setDiscoveryTitle(text);
                    if (discoveryErrors.title) {
                      setDiscoveryErrors({ ...discoveryErrors, title: undefined });
                    }
                  }}
                  editable={!loading}
                />
                {discoveryErrors.title && (
                  <Text style={styles.errorText}>{discoveryErrors.title}</Text>
                )}
              </View>

              {/* 國家 */}
              <View style={styles.fieldContainer}>
                <CountryPickerField
                  value={discoveryCountry}
                  onValueChange={(code) => {
                    setDiscoveryCountry(code);
                    if (discoveryErrors.country) {
                      setDiscoveryErrors({ ...discoveryErrors, country: undefined });
                    }
                  }}
                  label="國家"
                  required
                />
                {discoveryErrors.country && (
                  <Text style={styles.errorText}>{discoveryErrors.country}</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* 底部按鈕 */}
        <SafeAreaView edges={['bottom']} style={styles.buttonContainer}>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {loading
                  ? '發布中...'
                  : mode === 'trip'
                    ? '確認發布'
                    : '立即發布'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.md,
    padding: 4,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  fieldContainer: {
    marginBottom: spacing.xl,
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  buttonContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.brandOrange,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#ffffff',
  },
});

