import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
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
    answer: '你可以透過以下方式聯絡我們：\n• Email: support@bangbuy.app\n• 在 App 內回報問題',
  },
];

export default function HelpScreen() {
  const handleContactEmail = () => {
    Linking.openURL('mailto:support@bangbuy.app');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>幫助中心</Text>
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
              <Text style={styles.contactValue}>support@bangbuy.app</Text>
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
});


