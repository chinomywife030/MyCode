import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';

export default function SettingsScreen() {

  const handleOpenPrivacyPolicy = async () => {
    const url = 'https://bangbuy.app/privacy';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('錯誤', '無法開啟此連結');
      }
    } catch (error) {
      console.error('[SettingsScreen] Open privacy policy error:', error);
      Alert.alert('錯誤', '無法開啟隱私權政策');
    }
  };

  const handleOpenTermsOfService = async () => {
    const url = 'https://bangbuy.app/terms';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('錯誤', '無法開啟此連結');
      }
    } catch (error) {
      console.error('[SettingsScreen] Open terms of service error:', error);
      Alert.alert('錯誤', '無法開啟服務條款');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 版本資訊 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>關於</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>版本</Text>
            </View>
            <Text style={styles.settingValue}>v1.0.0</Text>
          </View>
        </View>

        {/* 說明 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>說明</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/help/shipping')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="airplane-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>運回台灣方式</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 法律條款 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>法律條款</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleOpenPrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>隱私權政策</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleOpenTermsOfService}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>服務條款</Text>
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    color: colors.text,
    marginLeft: spacing.md,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
});




