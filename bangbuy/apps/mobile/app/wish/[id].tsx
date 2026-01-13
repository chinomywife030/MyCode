import { StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Text, View, Modal, TextInput, Platform, KeyboardAvoidingView, AppState, AppStateStatus } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocalSearchParams, Link, useFocusEffect, router as expoRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getWishById, deleteWish, type Wish } from '@/src/lib/wishes';
import { getOffersForWish, createOffer, formatAmount, type Offer } from '@/src/lib/offers';
import { getCurrentUser } from '@/src/lib/auth';
import { navigateToRoute } from '@/src/lib/navigation';
import { Screen } from '@/src/ui/Screen';
import { TopBar } from '@/src/ui/TopBar';
import { Card } from '@/src/ui/Card';
import { Tag } from '@/src/ui/Tag';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { WishHeroCarousel } from '@/src/components/WishHeroCarousel';
import { getCountryFlag } from '@/src/utils/countryFlag';
import { startChat } from '@/src/lib/chat';
import { ShippingHelpLink } from '@/src/components/ShippingHelpLink';

/**
 * 安全地開啟 URL
 */
function openUrl(url: string) {
  let finalUrl = url.trim();
  
  if (!finalUrl.match(/^https?:\/\//i)) {
    finalUrl = `https://${finalUrl}`;
  }
  
  try {
    new URL(finalUrl);
    Linking.openURL(finalUrl).catch(() => {
      Alert.alert('錯誤', '無法開啟連結');
    });
  } catch {
    Alert.alert('錯誤', '無效的連結格式');
  }
}

export default function WishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wish, setWish] = useState<Wish | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersIsBuyer, setOffersIsBuyer] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 報價刷新狀態：避免重複請求
  const isFetchingOffersRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  
  // 報價 Modal 狀態
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setCheckingAuth(false);
      } catch (error) {
        console.error('[WishDetailScreen] Auth check error:', error);
        setCheckingAuth(false);
      }
    };

    if (id) {
      checkAuth();
    } else {
      setCheckingAuth(false);
      setNotFound(true);
    }
  }, [id]);

  const fetchWish = async () => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const data = await getWishById(id);
      if (data === undefined) {
        setNotFound(true);
      } else {
        setWish(data);
        
        // Debug: 验证图片 URL
        if (data.images && data.images.length > 0) {
          console.log('[WishDetailScreen] Wish images URLs:', {
            wishId: data.id,
            imageCount: data.images.length,
            urls: data.images,
            // 提示：可以在浏览器中打开这些 URL 验证图片是否可访问
            // 如果无法访问，请检查 Supabase Storage RLS Policy
          });
          
          data.images.forEach((url: string, index: number) => {
            const isValidUrl = url?.startsWith('http://') || url?.startsWith('https://');
            if (!isValidUrl) {
              console.warn(`[WishDetailScreen] Invalid image URL at index ${index}:`, url);
            }
          });
        }
        
        refreshOffers();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入失敗：發生未知錯誤';
      setError(errorMessage);
      console.error('[WishDetailScreen] fetchWish error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 刷新報價（從 offers 表獲取，與 Web 一致）
   */
  const refreshOffers = useCallback(async () => {
    if (!id) {
      console.log('[WishDetail] refreshOffers skipped: no id');
      return;
    }
    
    // 防重入保護：如果正在 fetch，直接返回
    if (isFetchingOffersRef.current) {
      console.log('[WishDetail] refreshOffers skipped: already fetching');
      return;
    }
    
    const wishId = id as string;
    console.log(`[WishDetail] refreshOffers start wishId=${wishId}`);
    
    try {
      isFetchingOffersRef.current = true;
      setOffersLoading(true);
      
      // 使用 offers 表（與 Web 一致）
      const result = await getOffersForWish(wishId);
      
      console.log(`[WishDetail] offers fetched:`, {
        success: result.success,
        count: result.offers.length,
        isBuyer: result.isBuyer,
        error: result.error,
      });
      
      if (result.success) {
        setOffers(result.offers);
        setOffersIsBuyer(result.isBuyer || false);
        
        // Debug: 輸出報價詳情
        if (result.offers.length > 0) {
          const amounts = result.offers.map(o => o.amount);
          console.log(`[WishDetail] offer amounts (first 5):`, amounts.slice(0, 5));
          
          const latestOffer = result.offers[0];
          console.log(`[WishDetail] latest offer:`, {
            id: latestOffer.id,
            amount: latestOffer.amount,
            created_at: latestOffer.created_at,
            status: latestOffer.status,
            shopper_name: latestOffer.shopper_name,
          });
        }
        
        console.log(`[WishDetail] refreshOffers completed: ${result.offers.length} offers`);
      } else {
        console.error('[WishDetail] refreshOffers failed:', result.error);
      }
    } catch (err) {
      console.error('[WishDetail] refreshOffers error:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
      // 錯誤時不清空現有數據，保持顯示
    } finally {
      setOffersLoading(false);
      isFetchingOffersRef.current = false;
    }
  }, [id]);

  const fetchCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('[WishDetailScreen] fetchCurrentUser error:', err);
    }
  };

  useEffect(() => {
    if (!checkingAuth && id) {
      fetchWish();
      fetchCurrentUser();
    }
  }, [id, checkingAuth]);

  // Focus 時自動刷新報價：當頁面獲得焦點時觸發
  useFocusEffect(
    useCallback(() => {
      if (id) {
        // 刷新 wish 数据（避免显示旧缓存）
        fetchWish();
        // 無論 wish 是否存在，都刷新報價（因為報價可能在其他地方更新）
        refreshOffers();
      }
    }, [id, refreshOffers])
  );

  // AppState 監聽：當 App 從背景回到前景時，如果此頁面仍為 focus，則刷新報價
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      // 當 App 從 background/inactive 回到 active，且頁面有 id 時，刷新報價
      if (
        previousAppState.match(/inactive|background/) &&
        nextAppState === 'active' &&
        id
      ) {
        console.log('[WishDetail] App returned to foreground, refreshing offers');
        refreshOffers();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [id, refreshOffers]);

  const handleRetry = () => {
    fetchWish();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // 提取 URL 的 domain
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // 複製 URL
  const copyUrl = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('已複製', '連結已複製到剪貼簿');
    } catch (error) {
      console.error('[WishDetailScreen] Copy URL error:', error);
      Alert.alert('錯誤', '複製失敗');
    }
  };

  // 處理報價按鈕點擊
  const handleOfferPress = async () => {
    if (!currentUser) {
      const currentRoute = `/wish/${id}`;
      navigateToRoute(currentRoute, true);
      return;
    }
    setOfferModalVisible(true);
  };

  // 處理私訊按鈕點擊
  const handleMessagePress = async () => {
    if (!currentUser) {
      const currentRoute = `/wish/${id}`;
      navigateToRoute(currentRoute, true);
      return;
    }

    if (!wish?.buyerId) {
      Alert.alert('錯誤', '無法找到委託人資訊');
      return;
    }

    try {
      const result = await startChat(wish.buyerId);
      if (result.success && result.conversationId) {
        expoRouter.push(`/chat/${result.conversationId}` as any);
      } else {
        Alert.alert('錯誤', result.error || '無法開啟聊天室');
      }
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '無法開啟聊天室');
    }
  };

  // 提交報價（使用 offers 表，與 Web 一致）
  const handleSubmitOffer = async () => {
    if (!id) {
      Alert.alert('錯誤', '找不到需求 ID');
      return;
    }

    if (!offerPrice.trim()) {
      Alert.alert('錯誤', '請輸入代購費');
      return;
    }

    const priceValue = parseFloat(offerPrice.trim());
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('錯誤', '請輸入有效的代購費金額');
      return;
    }

    setSubmittingOffer(true);

    try {
      // 使用 createOffer（與 Web 一致，寫入 offers 表）
      const result = await createOffer({
        wishId: id as string,
        amount: priceValue,
        message: offerMessage.trim() || undefined,
      });

      console.log('[WishDetailScreen] createOffer result:', result);

      if (result.success) {
        setOfferModalVisible(false);
        setOfferPrice('');
        setOfferMessage('');
        
        // 刷新報價列表
        await refreshOffers();

        // 導向聊天室
        if (wish?.buyerId) {
          try {
            const chatResult = await startChat(wish.buyerId);
            if (chatResult.success && chatResult.conversationId) {
              expoRouter.push(`/chat/${chatResult.conversationId}` as any);
            }
          } catch (chatError) {
            // 聊天室開啟失敗不影響報價成功
            console.warn('[WishDetailScreen] Failed to open chat:', chatError);
          }
        }

        Alert.alert('成功', '報價已送出');
      } else {
        Alert.alert('錯誤', result.error || '送出失敗，請稍後再試');
      }
    } catch (error: any) {
      console.error('[WishDetailScreen] Submit offer error:', error);
      Alert.alert('錯誤', error.message || '送出失敗，請稍後再試');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // 判斷是否為需求發布者
  const isOwner = currentUser && wish?.buyerId === currentUser.id;

  // 處理刪除
  const handleDelete = () => {
    Alert.alert(
      '刪除確認',
      '確定要刪除嗎？刪除後其他使用者將無法看到。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            if (!wish?.id || deleting) return;
            
            setDeleting(true);
            try {
              const result = await deleteWish(wish.id);
              if (result.success) {
                Alert.alert('成功', '需求已刪除', [
                  {
                    text: '確定',
                    onPress: () => {
                      expoRouter.back();
                    },
                  },
                ]);
              } else {
                Alert.alert('刪除失敗', result.error || '請稍後再試');
              }
            } catch (error) {
              console.error('[WishDetailScreen] Delete error:', error);
              Alert.alert('刪除失敗', '請稍後再試');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (checkingAuth || loading) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Wish Detail</Text>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>重試</Text>
          </TouchableOpacity>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>返回首頁</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  if (notFound || !wish) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Wish Detail</Text>
          <Text style={styles.notFound}>找不到這個願望單</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>返回首頁</Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => expoRouter.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>需求詳情</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={24}
              color={deleting ? colors.textMuted : colors.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero 圖片輪播 */}
        <WishHeroCarousel images={wish.images || []} />

        {/* 標題卡片 */}
        <Card style={styles.titleCard}>
          <Text style={styles.title}>{wish.title}</Text>
          {wish.targetCountry && (() => {
            const flag = getCountryFlag(wish.targetCountry);
            const displayText = flag ? `${flag} ${wish.targetCountry}` : wish.targetCountry;
            return (
              <View style={styles.tagContainer}>
                <Tag label={displayText} />
              </View>
            );
          })()}
        </Card>

        {/* 描述區塊 */}
        {wish.description && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>描述</Text>
            <Text style={styles.descriptionText}>{wish.description}</Text>
          </Card>
        )}

        {/* 連結區塊 - 改進版 */}
        {wish.productUrl && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>連結</Text>
            <View style={styles.linkContainer}>
              <Text style={styles.linkDomain} numberOfLines={1}>
                {extractDomain(wish.productUrl)}
              </Text>
              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={styles.linkActionButton}
                  onPress={() => openUrl(wish.productUrl!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={18} color={colors.brandOrange} />
                  <Text style={styles.linkActionText}>開啟</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkActionButton}
                  onPress={() => copyUrl(wish.productUrl!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.brandOrange} />
                  <Text style={styles.linkActionText}>複製</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}

        {/* 需求資訊區塊 - 視覺優化 */}
        {(wish.budget || wish.targetCountry || wish.category || wish.deadline) && (
          <Card style={styles.sectionCard}>
            <View style={styles.infoGrid}>
              {wish.budget && (
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={18} color={colors.brandOrange} />
                  <Text style={styles.infoItemValue}>NT$ {wish.budget.toLocaleString()}</Text>
                </View>
              )}
              {wish.targetCountry && (() => {
                const flag = getCountryFlag(wish.targetCountry);
                const displayText = flag ? `${flag} ${wish.targetCountry}` : wish.targetCountry;
                return (
                  <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={18} color={colors.brandOrange} />
                    <Text style={styles.infoItemValue}>{displayText}</Text>
                  </View>
                );
              })()}
              {wish.deadline && (
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={18} color={colors.brandOrange} />
                  <Text style={styles.infoItemValue}>{wish.deadline}</Text>
                </View>
              )}
              {wish.category && (
                <View style={styles.infoItem}>
                  <Tag label={wish.category} />
                </View>
              )}
            </View>
          </Card>
        )}

        {/* 已收到的報價區塊（從 offers 表獲取，與 Web 一致） */}
        {isOwner && offers.length > 0 ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>已收到的報價</Text>
              <TouchableOpacity
                onPress={refreshOffers}
                disabled={offersLoading || isFetchingOffersRef.current}
                style={styles.refreshButton}
                activeOpacity={0.7}
              >
                <Text style={styles.refreshButtonText}>
                  {offersLoading ? '刷新中...' : '刷新'}
                </Text>
              </TouchableOpacity>
            </View>
            {/* 顯示所有報價 */}
            {offers.map((offer: Offer, index: number) => (
              <View key={offer.id} style={[styles.offerCard, index > 0 && styles.offerCardMarginTop]}>
                <View style={styles.offerHeader}>
                  <Text style={styles.offerShopperName}>{offer.shopper_name || '代購者'}</Text>
                  <Text style={styles.offerAmount}>{formatAmount(offer.amount)}</Text>
                </View>
                {offer.message && (
                  <Text style={styles.offerMessage}>{offer.message}</Text>
                )}
                <Text style={styles.offerDate}>{formatDate(offer.created_at)}</Text>
              </View>
            ))}
          </Card>
        ) : !isOwner && offers.length > 0 ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>已收到的報價</Text>
              <TouchableOpacity
                onPress={refreshOffers}
                disabled={offersLoading || isFetchingOffersRef.current}
                style={styles.refreshButton}
                activeOpacity={0.7}
              >
                <Text style={styles.refreshButtonText}>
                  {offersLoading ? '刷新中...' : '刷新'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.replyCountText}>已有 {offers.length} 人報價</Text>
          </Card>
        ) : null}

        {/* 運回台灣方式說明連結 */}
        <ShippingHelpLink variant="detail" />

        {/* 底部留白，避免被固定行動列遮擋 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 底部固定行動列 */}
      <SafeAreaView edges={['bottom']} style={styles.stickyCTA}>
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={handleOfferPress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryCTAText}>我要報價 / 接單</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryCTA}
            onPress={handleMessagePress}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryCTAText}>先私訊問清楚</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 報價 Modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setOfferModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>我要報價</Text>
              <TouchableOpacity
                onPress={() => setOfferModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>代購費 <Text style={styles.required}>*</Text></Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.pricePrefix}>NT$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="請輸入金額"
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    keyboardType="numeric"
                    editable={!submittingOffer}
                  />
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>留言給委託人（選填）</Text>
                <TextInput
                  style={styles.messageTextArea}
                  placeholder="例如：我可以幫你代購，預計 3/15 可寄出..."
                  value={offerMessage}
                  onChangeText={setOfferMessage}
                  multiline
                  numberOfLines={4}
                  editable={!submittingOffer}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitButton, submittingOffer && styles.modalSubmitButtonDisabled]}
                onPress={handleSubmitOffer}
                disabled={submittingOffer}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {submittingOffer ? '送出中...' : '送出報價'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setOfferModalVisible(false)}
                disabled={submittingOffer}
              >
                <Text style={styles.modalCancelButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120, // 為固定行動列留出空間
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    padding: spacing['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  notFound: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brandOrange,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    fontSize: fontSize.base,
    color: colors.brandOrange,
    textDecorationLine: 'underline',
  },
  titleCard: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tagContainer: {
    alignSelf: 'flex-start',
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  refreshButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  refreshButtonText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
    fontWeight: fontWeight.medium,
  },
  descriptionText: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkDomain: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    marginRight: spacing.md,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  linkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkActionText: {
    fontSize: fontSize.sm,
    color: colors.brandOrange,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoItemValue: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  replyButton: {
    backgroundColor: colors.brandOrange,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  replyButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  // 報價卡片樣式（新增）
  offerCard: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offerCardMarginTop: {
    marginTop: spacing.sm,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  offerShopperName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  offerAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.brandOrange,
  },
  offerMessage: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  offerDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // 舊的 reply 樣式（保留以備用）
  replyCard: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyMessage: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  replyDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  replyCountText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  bottomSpacer: {
    height: 100, // 為固定行動列留出空間
  },
  stickyCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  ctaContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  primaryCTA: {
    flex: 1,
    backgroundColor: colors.brandOrange,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCTAText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  secondaryCTA: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCTAText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalInputGroup: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  pricePrefix: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  messageTextArea: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    minHeight: 100,
  },
  modalSubmitButton: {
    backgroundColor: colors.brandOrange,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
  },
});
