/**
 * 發布許願單頁面
 * 功能對齊 web 的 /create
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Input } from '@/src/ui';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCurrentUser } from '@/src/lib/auth';
import { createWishRequest } from '@/src/features/wishCreate/wishCreateService';
import { WishImagePicker } from '@/src/features/wishCreate/WishImagePicker';
import { CountryPickerField } from '@/src/components/CountryPickerField';
import { CategoryChips } from '@/src/components/CategoryChips';
import { DateField } from '@/src/components/DateField';
import { TagsInput } from '@/src/components/TagsInput';
import { ShippingHelpLink } from '@/src/components/ShippingHelpLink';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CreateWishScreen() {
  const params = useLocalSearchParams<{
    prefill_title?: string;
    prefill_country?: string;
    prefill_city?: string;
    prefill_image?: string;
  }>();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 表單狀態 - 商品資訊
  // 使用原始 asset 对象（用于上传）
  const [imageAssets, setImageAssets] = useState<Array<{ uri: string; mimeType?: string; fileName?: string }>>([]);
  const [title, setTitle] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [targetCountry, setTargetCountry] = useState<string>('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [allowSubstitute, setAllowSubstitute] = useState(true);

  // 表單狀態 - 價格資訊
  const [unitPriceNT, setUnitPriceNT] = useState('');
  const [serviceFeeNT, setServiceFeeNT] = useState('');
  const [budgetCapNT, setBudgetCapNT] = useState('');

  // 表單狀態 - 期限與備註
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // 錯誤狀態
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  // 處理預填充數據
  useEffect(() => {
    if (params.prefill_title) {
      setTitle(params.prefill_title);
    }
    if (params.prefill_country) {
      setTargetCountry(params.prefill_country);
    }
    if (params.prefill_image) {
      // 预填充图片（如果有）
      setImageAssets([{ uri: params.prefill_image }]);
    }
    // 注意：city 字段在 CreateWishScreen 中可能不存在，需要檢查是否有對應字段
  }, [params]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      Alert.alert('請先登入', '發布許願單需要先登入', [
        {
          text: '前往登入',
          onPress: () => router.push('/login'),
        },
        {
          text: '取消',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
    setUser(currentUser);
  };

  // 計算預估總價
  const estimatedTotalNT = useMemo(() => {
    const unitPrice = parseFloat(unitPriceNT) || 0;
    const serviceFee = parseFloat(serviceFeeNT) || 0;
    return unitPrice + serviceFee;
  }, [unitPriceNT, serviceFeeNT]);

  // 處理數字輸入（防止負數）
  const handleNumberChange = (
    value: string,
    setter: (value: string) => void,
    fieldName: string
  ) => {
    // 允許空字串
    if (value === '') {
      setter('');
      return;
    }

    // 檢查是否為有效數字
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return; // 不更新，保持原值
    }

    // 檢查負數
    if (numValue < 0) {
      Alert.alert('輸入錯誤', `${fieldName}不能為負數`);
      return;
    }

    setter(value);
  };

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '請輸入商品名稱';
    }

    if (!targetCountry) {
      newErrors.targetCountry = '請選擇購買國家';
    }

    // 驗證價格（必須是數字且 >= 0）
    if (unitPriceNT && (isNaN(Number(unitPriceNT)) || Number(unitPriceNT) < 0)) {
      newErrors.unitPriceNT = '商品單價必須是 0 或正數';
    }

    if (serviceFeeNT && (isNaN(Number(serviceFeeNT)) || Number(serviceFeeNT) < 0)) {
      newErrors.serviceFeeNT = '代購費必須是 0 或正數';
    }

    if (budgetCapNT && (isNaN(Number(budgetCapNT)) || Number(budgetCapNT) < 0)) {
      newErrors.budgetCapNT = '預算上限必須是 0 或正數';
    }

    // 驗證期限（目前設為 optional，但可以根據需求改為必填）
    // if (!dueDate) {
    //   newErrors.dueDate = '請選擇希望完成日期';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 驗證圖片（簡化版，實際上傳時會再檢查）
  const validateImages = async (): Promise<boolean> => {
    // 圖片驗證在上傳時進行，這裡只做基本檢查
    return true;
  };

  // 提交表單
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('錯誤', '請先登入');
      return;
    }

    // 驗證表單
    if (!validateForm()) {
      Alert.alert('請填寫必填欄位', '請檢查表單並修正錯誤');
      return;
    }

    // 驗證圖片
    if (!(await validateImages())) {
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // 準備價格資料
      const priceValue = unitPriceNT ? Number(unitPriceNT) : undefined;
      const feeValue = serviceFeeNT ? Number(serviceFeeNT) : undefined;
      const budgetCapValue = budgetCapNT ? Number(budgetCapNT) : undefined;
      const estimatedTotalValue = estimatedTotalNT > 0 ? estimatedTotalNT : undefined;

      // 使用新的创建服务（包含图片上传）
      console.log('[CreateWishScreen] Starting wish creation:', {
        title: title.trim(),
        imageAssetsCount: imageAssets.length,
        userId: user.id,
      });

      setUploading(imageAssets.length > 0);

      const result = await createWishRequest(
        {
          title: title.trim(),
          description: notes.trim() || undefined,
          budget: estimatedTotalValue,
          price: priceValue,
          commission: feeValue,
          productUrl: productUrl.trim() || undefined,
          targetCountry: targetCountry,
          category: category,
          deadline: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
          isUrgent: isUrgent,
        },
        imageAssets // 传入原始 assets，服务会处理上传
      );

      if (!result.success) {
        // 显示详细错误信息
        const errorMsg = result.error || '發布許願單時發生錯誤';
        console.error('[CreateWishScreen] Create failed:', {
          error: errorMsg,
          payload: {
            title: title.trim(),
            imageAssetsCount: imageAssets.length,
          },
        });
        Alert.alert('發布失敗', errorMsg);
        setLoading(false);
        setUploading(false);
        return;
      }

      setLoading(false);
      setUploading(false);

      // Debug: 验证创建结果
      console.log('[CreateWishScreen] Wish created successfully:', {
        id: result.wish?.id,
        title: result.wish?.title,
        imagesCount: result.wish?.images?.length || 0,
        images: result.wish?.images,
      });

      // 成功提示
      Alert.alert('已發布許願單', '你的許願單已成功發布！', [
        {
          text: '查看許願單',
          onPress: () => {
            if (result.wish) {
              router.replace(`/wish/${result.wish.id}`);
            } else {
              router.back();
            }
          },
        },
        {
          text: '返回',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[CreateWishScreen] Error:', error);
      Alert.alert('錯誤', error.message || '發布許願單時發生錯誤');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // 檢查是否可以提交
  const canSubmit = title.trim() && targetCountry && !loading;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>發布許願單</Text>
            <Text style={styles.headerSubtitle}>填寫你想購買的商品資訊</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 圖片區塊 */}
          <Card style={styles.card}>
            <WishImagePicker
              assets={imageAssets}
              maxImages={6}
              onAssetsChange={setImageAssets}
            />
          </Card>

          {/* 商品資訊卡 */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>商品資訊</Text>

            <Input
              label="商品名稱 *"
              placeholder="例如：Jellycat 兔子娃娃 30cm"
              value={title}
              onChangeText={setTitle}
              error={errors.title}
              editable={!loading}
            />

            <Input
              label="商品連結"
              placeholder="https://..."
              value={productUrl}
              onChangeText={setProductUrl}
              keyboardType="url"
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.hint}>貼上官網或貼文連結</Text>

            <CountryPickerField
              label="購買國家 *"
              value={targetCountry}
              onValueChange={setTargetCountry}
              required
            />
            {errors.targetCountry && (
              <Text style={styles.errorText}>{errors.targetCountry}</Text>
            )}

            <CategoryChips
              label="商品分類"
              value={category}
              onValueChange={setCategory}
            />

            <View style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>可接受替代品</Text>
                <Text style={styles.switchHint}>
                  勾選後，代購者可以建議類似商品
                </Text>
              </View>
              <Switch
                value={allowSubstitute}
                onValueChange={setAllowSubstitute}
                trackColor={{ false: colors.border, true: colors.brandOrange }}
                thumbColor="#ffffff"
                disabled={loading}
              />
            </View>
          </Card>

          {/* 價格資訊卡 */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>💰 價格資訊</Text>

            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Input
                  label="商品單價 (NT$) *"
                  placeholder="0"
                  value={unitPriceNT}
                  onChangeText={(value) => handleNumberChange(value, setUnitPriceNT, '商品單價')}
                  keyboardType="numeric"
                  error={errors.unitPriceNT}
                  editable={!loading}
                />
              </View>

              <View style={styles.priceItem}>
                <Input
                  label="代購費 (NT$)"
                  placeholder="建議 100-500"
                  value={serviceFeeNT}
                  onChangeText={(value) => handleNumberChange(value, setServiceFeeNT, '代購費')}
                  keyboardType="numeric"
                  error={errors.serviceFeeNT}
                  editable={!loading}
                />
              </View>
            </View>

            <Input
              label="預算上限 (NT$)"
              placeholder="超過此金額需先確認"
              value={budgetCapNT}
              onChangeText={(value) => handleNumberChange(value, setBudgetCapNT, '預算上限')}
              keyboardType="numeric"
              error={errors.budgetCapNT}
              editable={!loading}
            />

            {/* 預估總價 */}
            <View style={styles.estimatedTotalContainer}>
              <View style={styles.estimatedTotalHeader}>
                <Text style={styles.estimatedTotalLabel}>預估總價</Text>
                <Text style={styles.estimatedTotalValue}>
                  NT$ {estimatedTotalNT.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.estimatedTotalFormula}>
                = 單價 ({unitPriceNT || 0}) + 代購費 ({serviceFeeNT || 0})
              </Text>
              <Text style={styles.estimatedTotalWarning}>
                ⚠️ 可能另含國際運費、關稅等費用
              </Text>
            </View>
          </Card>

          {/* 期限與備註卡 */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>📅 期限與備註</Text>

            <View style={styles.deadlineRow}>
              <View style={styles.deadlineItem}>
                <DateField
                  label="希望完成日期"
                  value={dueDate}
                  onChange={setDueDate}
                  error={errors.dueDate}
                  minimumDate={new Date()}
                  editable={!loading}
                />
                <Text style={styles.hint}>代購者需在此日期前完成購買</Text>
              </View>

              <View style={styles.urgentContainer}>
                <TouchableOpacity
                  style={[styles.urgentButton, isUrgent && styles.urgentButtonActive]}
                  onPress={() => setIsUrgent(!isUrgent)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="flame"
                    size={20}
                    color={isUrgent ? '#ffffff' : colors.error}
                    style={styles.urgentIcon}
                  />
                  <Text style={[styles.urgentText, isUrgent && styles.urgentTextActive]}>
                    🔥 這是急單！
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 備註 */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>需求備註</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="其他補充說明，例如：限定版、特定店鋪購買等"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
              <Text style={styles.hint}>
                💡 可寫明希望的運送方式（快遞/郵政/轉運/代帶）
              </Text>
            </View>

            {/* 標籤 */}
            <TagsInput
              label="關鍵字標籤"
              value={tags}
              onChange={setTags}
              placeholder="例如：jellycat, selfridges, 限定版"
            />

            {/* 運回台灣方式說明連結 */}
            <ShippingHelpLink variant="create" />
          </Card>
        </ScrollView>

        {/* 底部固定按鈕 */}
        <View style={styles.footer}>
          <Button
            title={uploading ? '上傳圖片中...' : loading ? '發布中...' : '送出'}
            onPress={handleSubmit}
            disabled={!canSubmit || loading || uploading}
            loading={loading || uploading}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  switchHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceItem: {
    flex: 1,
  },
  estimatedTotalContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  estimatedTotalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  estimatedTotalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  estimatedTotalValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.brandOrange,
  },
  estimatedTotalFormula: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  estimatedTotalWarning: {
    fontSize: fontSize.xs,
    color: '#D97706',
    marginTop: spacing.xs,
  },
  deadlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  deadlineItem: {
    flex: 1,
  },
  urgentContainer: {
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  urgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  urgentButtonActive: {
    backgroundColor: colors.error,
  },
  urgentIcon: {
    marginRight: spacing.xs,
  },
  urgentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  urgentTextActive: {
    color: '#ffffff',
  },
  notesContainer: {
    marginBottom: spacing.lg,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 80,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        paddingBottom: spacing.xl,
      },
    }),
  },
});
