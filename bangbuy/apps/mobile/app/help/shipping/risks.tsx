import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight, radius } from '@/src/theme/tokens';

interface RiskSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
}

const riskSections: RiskSection[] = [
  {
    id: 'prohibited',
    title: '禁運品提醒',
    icon: 'ban-outline',
    items: [
      '禁止進口：毒品、槍械、彈藥、仿冒品等違法物品',
      '限制進口：食品、藥品、化妝品需符合台灣法規',
      '動植物及其製品需檢疫證明',
      '電子菸、菸草製品有特殊限制',
      '建議購買前先查詢台灣海關規定'
    ],
  },
  {
    id: 'customs',
    title: '關稅與報關',
    icon: 'document-text-outline',
    items: [
      '商品價值超過新台幣 2,000 元需繳納關稅',
      '關稅計算方式：商品價值 × 關稅稅率（依商品類別而定）',
      '代購者或轉運公司會協助處理報關手續',
      '關稅費用通常由收件人負擔，會另行通知',
      '部分商品可能需額外繳納營業稅（5%）'
    ],
  },
  {
    id: 'electronics',
    title: '電子產品',
    icon: 'phone-portrait-outline',
    items: [
      '需符合台灣電磁相容性（EMC）規定',
      '部分電子產品需 NCC 認證',
      '充電器、變壓器需符合台灣電壓規格（110V）',
      '建議購買前確認產品規格與台灣相容性',
      '代購者可協助確認產品是否符合台灣法規'
    ],
  },
  {
    id: 'insurance',
    title: '保險與包裝',
    icon: 'shield-checkmark-outline',
    items: [
      '建議為高價值商品購買運送保險',
      '妥善包裝可降低運送過程中的損壞風險',
      '易碎品需特別加強包裝保護',
      '代購者攜帶回台可提供最安全的運送方式',
      '如商品損壞，請立即拍照並聯繫代購者處理理賠'
    ],
  },
];

export default function ShippingRisksScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>風險與法規</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 提醒文字 */}
        <View style={styles.warningSection}>
          <Ionicons name="information-circle" size={24} color={colors.brandOrange} />
          <Text style={styles.warningText}>
            購買海外商品前，請務必了解相關法規與風險，避免不必要的麻煩
          </Text>
        </View>

        {/* 各風險區塊 */}
        {riskSections.map((section, index) => (
          <Card key={section.id} style={[styles.sectionCard, index < riskSections.length - 1 && styles.sectionCardMargin]}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={24} color={colors.brandOrange} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.itemsContainer}>
              {section.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}

        {/* 建議 */}
        <Card style={styles.suggestionCard}>
          <View style={styles.suggestionHeader}>
            <Ionicons name="bulb-outline" size={24} color={colors.brandOrange} />
            <Text style={styles.suggestionTitle}>BangBuy 建議</Text>
          </View>
          <Text style={styles.suggestionText}>
            選擇「代購者攜帶回台」方式可大幅降低運送風險，代購者會親自驗貨並妥善包裝，
            確保商品安全送達。如有任何疑問，建議在交易前與代購者充分溝通，確認所有細節。
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF4E6',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  sectionCard: {
    padding: spacing.lg,
  },
  sectionCardMargin: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  itemsContainer: {
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brandOrange,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  suggestionCard: {
    padding: spacing.lg,
    backgroundColor: '#F0F9FF',
    borderColor: colors.brandOrange,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  suggestionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
