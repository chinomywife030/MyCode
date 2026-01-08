import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCurrentUser } from '@/src/lib/auth';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [language, setLanguage] = useState('zh-TW');

  useEffect(() => {
    loadUser();
    loadNotificationStatus();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (!currentUser) {
      router.replace('/login');
    }
  };

  const loadNotificationStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.error('[SettingsScreen] Load notification status error:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
        if (status !== 'granted') {
          Alert.alert('權限被拒絕', '請在系統設定中開啟通知權限');
        }
      } else {
        // 無法直接關閉權限，只能提示用戶
        Alert.alert('關閉通知', '請在系統設定中關閉通知權限');
      }
    } catch (error) {
      console.error('[SettingsScreen] Toggle notification error:', error);
    }
  };

  const handleLanguagePress = () => {
    Alert.alert('語言設定', '目前僅支援繁體中文', [{ text: '確定' }]);
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
        {/* 語言設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>一般</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLanguagePress}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>語言</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>繁體中文</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 通知設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <Text style={styles.settingLabel}>推播通知</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.brandOrange }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

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


