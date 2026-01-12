import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight, radius } from '@/src/theme/tokens';

interface ShippingMethod {
  id: string;
  title: string;
  description: string;
  advantages: string[];
  suitableFor: string;
  icon: keyof typeof Ionicons.glyphMap;
  detailsRoute: string;
}

const shippingMethods: ShippingMethod[] = [
  {
    id: 'express',
    title: '國際快遞',
    description: '透過 DHL、FedEx、UPS 等國際快遞公司直接運送，速度最快但費用較高',
    advantages: [
      '運送速度快，通常 3-7 個工作天',
      '可追蹤物流狀態，安全性高',
      '適合高價值或急用商品'
    ],
    suitableFor: '適合：急用商品、高價值物品、需要快速到貨的情況',
    icon: 'rocket-outline',
    detailsRoute: '/help/shipping/express',
  },
  {
    id: 'forwarding',
    title: '轉運 / 集運',
    description: '透過轉運公司集運多件商品，可節省運費，適合購買多樣商品',
    advantages: [
      '可合併多件商品，運費較經濟',
      '提供倉儲服務，可分批寄送',
      '適合購買多樣商品或需要比價的情況'
    ],
    suitableFor: '適合：購買多樣商品、需要比價、不急需到貨的情況',
    icon: 'cube-outline',
    detailsRoute: '/help/shipping/forwarding',
  },
  {
    id: 'carrier',
    title: '代購者攜帶回台',
    description: '代購者親自或委託他人將商品帶回台灣，BangBuy 核心優勢，最安全可靠',
    advantages: [
      '最安全可靠，商品損壞風險最低',
      '可避免複雜的報關手續',
      '代購者可親自驗貨，確保商品品質'
    ],
    suitableFor: '適合：所有商品類型，特別是易碎品、高價值商品、需要驗貨的情況',
    icon: 'person-outline',
    detailsRoute: '/help/shipping/carrier',
  },
];

export default function ShippingIndexScreen() {
  const handleViewDetails = (method: ShippingMethod) => {
    // 目前先導向風險頁，未來可擴展為各方式的詳細頁
    router.push('/help/shipping/risks');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>運回台灣方式</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 介紹文字 */}
        <View style={styles.introSection}>
          <Text style={styles.introText}>
            選擇適合的運送方式，讓您的海外商品安全、快速地送達台灣
          </Text>
        </View>

        {/* 三種主要方式 */}
        {shippingMethods.map((method, index) => (
          <Card key={method.id} style={[styles.methodCard, index < shippingMethods.length - 1 && styles.methodCardMargin]}>
            <View style={styles.methodHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={method.icon} size={28} color={colors.brandOrange} />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                {method.id === 'carrier' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>BangBuy 推薦</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.methodDescription}>{method.description}</Text>

            <View style={styles.advantagesSection}>
              {method.advantages.map((advantage, idx) => (
                <View key={idx} style={styles.advantageItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.brandOrange} />
                  <Text style={styles.advantageText}>{advantage}</Text>
                </View>
              ))}
            </View>

            <View style={styles.suitableForSection}>
              <Text style={styles.suitableForText}>{method.suitableFor}</Text>
            </View>

            <Button
              title="查看注意事項"
              onPress={() => handleViewDetails(method)}
              variant="outline"
              size="md"
              fullWidth
              style={styles.detailsButton}
            />
          </Card>
        ))}

        {/* 風險提醒連結 */}
        <TouchableOpacity
          style={styles.riskLink}
          onPress={() => router.push('/help/shipping/risks')}
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={20} color={colors.brandOrange} />
          <Text style={styles.riskLinkText}>查看風險與法規注意事項</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
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
  introSection: {
    marginBottom: spacing.xl,
  },
  introText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 24,
    textAlign: 'center',
  },
  methodCard: {
    padding: spacing.lg,
  },
  methodCardMargin: {
    marginBottom: spacing.lg,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  methodTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  advantagesSection: {
    marginBottom: spacing.md,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  advantageText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    marginLeft: spacing.xs,
    lineHeight: 20,
  },
  suitableForSection: {
    backgroundColor: '#F7F7F8',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  suitableForText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  detailsButton: {
    marginTop: spacing.xs,
  },
  riskLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  riskLinkText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: fontWeight.medium,
  },
});
