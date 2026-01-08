import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { getTripById, formatDateRange, type Trip } from '@/src/lib/trips';
import { getCurrentUser } from '@/src/lib/auth';
import { startChat } from '@/src/lib/chat';
import { Screen } from '@/src/ui/Screen';
import { Card } from '@/src/ui/Card';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@/src/theme/tokens';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:21',message:'TripDetailScreen mounted',data:{id,idType:typeof id,isCreateRoute:id==='create'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, []);
  // #endregion

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:26',message:'useEffect triggered',data:{id,idLength:id?.length,isValidUUID:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (id) {
      // #region agent log
      if (id === 'create') {
        fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:30',message:'ROUTE CONFLICT DETECTED',data:{id,shouldRedirect:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      }
      // #endregion
      fetchTrip();
      loadCurrentUser();
    }
  }, [id]);

  const loadCurrentUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const fetchTrip = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:33',message:'fetchTrip called',data:{id,idValue:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      setError(null);
      // #region agent log
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:40',message:'Before getTripById call',data:{id,isValidUUID,willCallAPI:isValidUUID},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (!isValidUUID) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:45',message:'Invalid UUID detected, redirecting',data:{id,reason:'not-a-valid-uuid'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (id === 'create') {
          router.replace('/trip/create');
          return;
        }
        setError('無效的行程 ID');
        setLoading(false);
        return;
      }
      
      const data = await getTripById(id as string);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:55',message:'getTripById returned',data:{hasData:!!data,dataId:data?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (data) {
        setTrip(data);
      } else {
        setError('找不到該行程');
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/trip/[id].tsx:64',message:'fetchTrip error caught',data:{errorMessage:err instanceof Error?err.message:'unknown',errorType:err?.constructor?.name,id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const errorMessage = err instanceof Error ? err.message : '載入失敗';
      setError(errorMessage);
      console.error('[TripDetailScreen] fetchTrip error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchTrip();
  };

  const handleMessagePress = async () => {
    if (!trip || messageLoading) return;

    try {
      setMessageLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await startChat(
        trip.shopperId,
        'trip',
        trip.id,
        trip.destination
      );

      if (!result.success) {
        Alert.alert('錯誤', result.error || '無法開啟對話');
      }
      // 成功時 startChat 會自動導航
    } catch (error: any) {
      console.error('[TripDetailScreen] handleMessagePress error:', error);
      Alert.alert('錯誤', error.message || '開啟對話失敗');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !trip) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>⚠️ {error || '找不到該行程'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>重試</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>行程詳情</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 用戶資訊卡片 */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            {trip.owner?.avatarUrl ? (
              <Image source={{ uri: trip.owner.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {trip.owner?.name ? trip.owner.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>{trip.owner?.name || '匿名用戶'}</Text>
              <Text style={styles.userRole}>代購夥伴</Text>
            </View>
          </View>
        </Card>

        {/* 目的地資訊 */}
        <Card style={styles.infoCard}>
          <Text style={styles.destination}>前往 {trip.destination}</Text>
          
          {dateRange && (
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>📅 行程日期</Text>
              <Text style={styles.dateValue}>{dateRange}</Text>
            </View>
          )}
        </Card>

        {/* 描述 */}
        {trip.description && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>行程說明</Text>
            <Text style={styles.description}>{trip.description}</Text>
          </Card>
        )}

        {/* 接單偏好 */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>接單偏好</Text>
          <View style={styles.tagsRow}>
            <View style={styles.preferenceTag}>
              <Text style={styles.preferenceText}>🛒 願意代購</Text>
            </View>
          </View>
        </Card>

        {/* 私訊按鈕 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.messageButton, messageLoading && styles.messageButtonDisabled]}
            onPress={handleMessagePress}
            activeOpacity={0.8}
            disabled={messageLoading}
          >
            <Text style={styles.messageButtonText}>
              {messageLoading ? '開啟中...' : '發送私訊'}
            </Text>
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
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backButtonText: {
    fontSize: fontSize.base,
    color: colors.brandBlue,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.brandBlue,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  userTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userRole: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  destination: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  dateValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preferenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  preferenceText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
  messageButton: {
    backgroundColor: colors.brandBlue,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

