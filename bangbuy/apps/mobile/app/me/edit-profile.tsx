import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Button } from '@/src/ui';
import { colors, spacing, fontSize, fontWeight } from '@/src/theme/tokens';
import { getCurrentProfile, updateDisplayName, uploadAvatarFromUri, updateAvatarUrl, type UserProfile } from '@/src/lib/profile';
import { getCurrentUser } from '@/src/lib/auth';
import { supabase } from '@/src/lib/supabase';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  // 使用 useCallback 包裝 loadData，避免每次 render 都創建新函數
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (!currentUser) {
        router.replace('/login');
        return;
      }

      const profileData = await getCurrentProfile();
      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || profileData.name || '');
      }
    } catch (error) {
      console.error('[EditProfileScreen] loadData error:', error);
      Alert.alert('錯誤', '載入資料失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  // 只在組件掛載時載入資料
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('錯誤', '請輸入暱稱');
      return;
    }

    try {
      setSaving(true);
      const result = await updateDisplayName(displayName.trim());
      
      if (result.success) {
        Alert.alert('成功', '暱稱已更新', [
          {
            text: '確定',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('錯誤', result.error || '更新失敗');
      }
    } catch (error: any) {
      console.error('[EditProfileScreen] handleSave error:', error);
      Alert.alert('錯誤', error.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPress = async () => {
    if (uploadingAvatar) {
      return;
    }

    try {
      // 請求相簿權限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('權限被拒絕', '需要相簿權限才能選擇頭像');
        return;
      }

      // 開啟圖片選擇器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // 正方形
        quality: 0.8, // 壓縮品質
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      
      // 顯示預覽
      setAvatarPreviewUri(imageUri);

      // 上傳頭像
      setUploadingAvatar(true);
      const uploadResult = await uploadAvatarFromUri(imageUri);

      if (!uploadResult.success) {
        Alert.alert('上傳失敗', uploadResult.error || '上傳頭像時發生錯誤');
        setAvatarPreviewUri(null);
        return;
      }

      // 更新 profiles.avatar_url
      const updateResult = await updateAvatarUrl(uploadResult.url!);
      
      if (!updateResult.success) {
        Alert.alert('更新失敗', updateResult.error || '更新頭像時發生錯誤');
        setAvatarPreviewUri(null);
        return;
      }

      // 立即讀回 profiles.avatar_url 驗證 DB 已更新
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('avatar_url, updated_at')
          .eq('id', currentUser.id)
          .single();
        
        if (!profileError && profileData) {
          console.log('AVATAR_VERIFY', {
            userId: currentUser.id,
            avatar_url: profileData.avatar_url,
            updated_at: profileData.updated_at,
            uploadedUrl: uploadResult.url,
            urlMatch: profileData.avatar_url === uploadResult.url || profileData.avatar_url?.includes(uploadResult.url.split('?')[0]),
          });
          
          // 驗證 URL 是否可訪問（測試 fetch）
          if (profileData.avatar_url) {
            try {
              const testUrl = profileData.avatar_url.split('?')[0]; // 移除 query string 測試
              const testResponse = await fetch(testUrl, { method: 'HEAD' });
              console.log('AVATAR_URL_TEST', {
                url: testUrl,
                status: testResponse.status,
                statusText: testResponse.statusText,
                contentType: testResponse.headers.get('content-type'),
                contentLength: testResponse.headers.get('content-length'),
              });
              
              if (!testResponse.ok) {
                console.error('[AVATAR_URL_TEST] URL not accessible:', {
                  status: testResponse.status,
                  statusText: testResponse.statusText,
                  url: testUrl,
                });
              }
            } catch (testError) {
              console.error('[AVATAR_URL_TEST] Fetch error:', testError);
            }
          }
          
          // 使用從 DB 讀取的值，確保一致性
          const dbAvatarUrl = profileData.avatar_url;
          if (dbAvatarUrl) {
            // 確保 URL 包含 cache busting（如果沒有則添加）
            const avatarUrlWithCache = dbAvatarUrl.includes('?') 
              ? `${dbAvatarUrl}&t=${Date.now()}`
              : `${dbAvatarUrl}?v=${Date.now()}`;
            
            setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrlWithCache } : null);
          }
        }
      }

      setAvatarPreviewUri(null);
      Alert.alert('成功', '頭像已更新');
    } catch (error: any) {
      console.error('[EditProfileScreen] handleAvatarPress error:', error);
      Alert.alert('錯誤', error.message || '選擇頭像時發生錯誤');
      setAvatarPreviewUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>編輯個人資料</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandOrange} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>編輯個人資料</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 頭像區域 */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={handleAvatarPress} 
            activeOpacity={0.7}
            disabled={uploadingAvatar}
          >
            {avatarPreviewUri ? (
              <Image
                key={`preview-${avatarPreviewUri}`}
                source={{ uri: avatarPreviewUri }}
                style={styles.avatarLarge}
                contentFit="cover"
              />
            ) : profile?.avatar_url ? (
              <Image
                key={profile.avatar_url}
                source={{ 
                  uri: profile.avatar_url.includes('?') 
                    ? `${profile.avatar_url}&t=${Date.now()}`
                    : `${profile.avatar_url}?v=${Date.now()}`
                }}
                style={styles.avatarLarge}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholderLarge}>
                <Text style={styles.avatarTextLarge}>
                  {(displayName || profile?.name || user?.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.avatarOverlay, uploadingAvatar && styles.avatarOverlayDisabled]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.changeAvatarButton, uploadingAvatar && styles.changeAvatarButtonDisabled]}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
            disabled={uploadingAvatar}
          >
            <Text style={styles.changeAvatarText}>
              {uploadingAvatar ? '上傳中...' : '更換頭像'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 暱稱輸入 */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>暱稱</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="請輸入暱稱"
            placeholderTextColor={colors.textMuted}
            maxLength={50}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            顯示名稱，其他用戶可以看到此名稱
          </Text>
        </View>

        {/* Email（只讀） */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnlyInput}>
            <Text style={styles.readOnlyText}>{user?.email || ''}</Text>
          </View>
          <Text style={styles.hint}>Email 無法修改</Text>
        </View>

        {/* 保存按鈕 */}
        <Button
          title={saving ? '保存中...' : '保存'}
          onPress={handleSave}
          variant="primary"
          size="lg"
          fullWidth
          disabled={saving}
          style={styles.saveButton}
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
  },
  avatarPlaceholderLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    right: '50%',
    marginRight: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarButton: {
    alignItems: 'center',
  },
  changeAvatarButtonDisabled: {
    opacity: 0.5,
  },
  changeAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.brandOrange,
  },
  avatarOverlayDisabled: {
    opacity: 0.7,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  readOnlyInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xs,
    opacity: 0.6,
  },
  readOnlyText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  saveButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});

