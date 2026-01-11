import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: '如何發布需求？',
    answer: '點擊首頁的「發布需求」按鈕，填寫商品資訊、預算和目標國家，即可發布需求等待代購者報價。',
  },
  {
    question: '如何成為代購者？',
    answer: '點擊首頁的「發布行程」按鈕，填寫你的行程資訊（目的地、日期等），即可開始接單賺錢。',
  },
  {
    question: '如何完成交易？',
    answer: '在聊天室中與代購者確認商品後，點擊「完成交易」按鈕，即可將訂單標記為已完成。',
  },
  {
    question: '如何聯絡客服？',
    answer: '你可以透過以下方式聯絡我們：\n• Email: bangbuy.contact@gmail.com\n• 在 App 內回報問題',
  },
];

export default function HelpScreen() {
  const handleContactEmail = async () => {
    const url = 'mailto:bangbuy.contact@gmail.com';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('錯誤', '無法開啟郵件應用程式');
      }
    } catch (error) {
      console.error('[HelpScreen] Open email error:', error);
      Alert.alert('錯誤', '無法開啟郵件應用程式');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>聯絡我們</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* FAQ 區塊 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>常見問題</Text>
          {faqData.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* 合作夥伴資訊 */}
        <View style={styles.section}>
          <View style={styles.partnerBanner}>
            <Ionicons name="handshake-outline" size={24} color={colors.brandOrange} />
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>合作夥伴與代購品牌招募</Text>
              <Text style={styles.partnerDescription}>
                我們正在尋找代購個人品牌、專業代購者、品牌商家與物流夥伴，一起打造更可靠、透明的跨境代購平台。
              </Text>
            </View>
          </View>
        </View>

        {/* 聯絡方式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>聯絡我們</Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleContactEmail}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={22} color={colors.brandOrange} />
            <View style={styles.contactContent}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>bangbuy.contact@gmail.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  faqItem: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqQuestion: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  contactValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(249, 115, 22, 0.15)', // 品牌橘色 15% 透明度
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)', // 品牌橘色 30% 透明度
  },
  partnerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  partnerTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.brandOrange,
    marginBottom: spacing.xs,
  },
  partnerDescription: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
    lineHeight: 20,
  },
});




