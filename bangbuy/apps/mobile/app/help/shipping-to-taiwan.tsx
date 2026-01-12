import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

export default function ShippingToTaiwanScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>如何運回台灣</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 標題 */}
        <View style={styles.section}>
          <Text style={styles.mainTitle}>如何將商品運回台灣</Text>
          <Text style={styles.introText}>
            BangBuy 提供安全、便捷的跨境代購服務，讓您輕鬆購買海外商品並運送回台灣。
          </Text>
        </View>

        {/* 購買完成後會發生什麼事 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.brandOrange} />
            <Text style={styles.sectionTitle}>購買完成後會發生什麼事</Text>
          </View>
          <View style={styles.contentCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>確認訂單</Text>
                <Text style={styles.stepDescription}>
                  代購者會確認您的訂單資訊，並開始採購商品。
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>商品採購</Text>
                <Text style={styles.stepDescription}>
                  代購者會在當地購買您指定的商品，並提供購買證明。
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>包裝與運送</Text>
                <Text style={styles.stepDescription}>
                  商品會經過妥善包裝，並透過可靠的物流管道運送回台灣。
                </Text>
              </View>
            </View>
            <View style={[styles.stepItem, styles.stepItemLast]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>送達與驗收</Text>
                <Text style={styles.stepDescription}>
                  商品送達後，您可以驗收商品並確認收貨，完成交易。
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 運送方式與流程 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="airplane-outline" size={24} color={colors.brandOrange} />
            <Text style={styles.sectionTitle}>運送方式與流程</Text>
          </View>
          <View style={styles.contentCard}>
            <View style={styles.methodItem}>
              <Text style={styles.methodTitle}>代購者直接運送</Text>
              <Text style={styles.methodDescription}>
                代購者會親自或委託物流公司將商品運送回台灣。適合代購者本身就在台灣，或定期往返的情況。
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.methodItem}>
              <Text style={styles.methodTitle}>轉運服務</Text>
              <Text style={styles.methodDescription}>
                代購者將商品寄送至轉運倉庫，再由轉運公司統一運送回台灣。適合需要集運多件商品的情況。
              </Text>
            </View>
          </View>
        </View>

        {/* 關稅與注意事項 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.brandOrange} />
            <Text style={styles.sectionTitle}>關稅與注意事項</Text>
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.noteText}>
              • 根據台灣海關規定，進口商品可能需要繳納關稅。關稅金額會根據商品類別、價值等因素計算。
            </Text>
            <Text style={styles.noteText}>
              • 代購者或轉運公司會協助處理報關手續，相關費用會包含在運費中或另行告知。
            </Text>
            <Text style={styles.noteText}>
              • 部分商品（如食品、藥品、化妝品等）可能需要額外的檢驗或證明文件，請在購買前確認。
            </Text>
            <Text style={styles.noteText}>
              • 建議在交易前與代購者確認所有費用明細，避免後續爭議。
            </Text>
          </View>
        </View>

        {/* 常見問題 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={24} color={colors.brandOrange} />
            <Text style={styles.sectionTitle}>常見問題</Text>
          </View>
          <View style={styles.contentCard}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>運送時間需要多久？</Text>
              <Text style={styles.faqAnswer}>
                運送時間會根據目的地、運送方式等因素而有所不同，一般約 7-14 個工作天。代購者會在交易時告知預估的運送時間。
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>如果商品在運送過程中損壞怎麼辦？</Text>
              <Text style={styles.faqAnswer}>
                如果商品在運送過程中發生損壞，請立即拍照並聯繫代購者。代購者會協助處理理賠事宜，或與物流公司協調解決方案。
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>可以追蹤運送狀態嗎？</Text>
              <Text style={styles.faqAnswer}>
                可以。代購者會提供物流追蹤號碼，您可以在物流公司的網站或 App 上查詢商品的運送狀態。
              </Text>
            </View>
          </View>
        </View>
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  mainTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  introText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 24,
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
  contentCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepItemLast: {
    marginBottom: 0,
  },
  methodItem: {
    // marginBottom 由 divider 提供間距
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  methodTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  methodDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  faqItem: {
    marginBottom: spacing.md,
  },
  faqQuestion: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
