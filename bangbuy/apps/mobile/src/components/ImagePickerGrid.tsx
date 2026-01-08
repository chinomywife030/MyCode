/**
 * 圖片選擇器網格組件
 * 支援多選、預覽、刪除
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { normalizeImagesToJpg } from '@/src/utils/imageHelpers';

interface ImagePickerGridProps {
  images: string[]; // 圖片 URI 陣列
  maxImages?: number;
  onImagesChange: (images: string[]) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImagePickerGrid({
  images,
  maxImages = 6,
  onImagesChange,
}: ImagePickerGridProps) {
  const pickImages = async () => {
    try {
      // 請求權限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('權限被拒絕', '請在系統設定中開啟相簿權限');
        return;
      }

      // 計算還能選擇幾張
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        Alert.alert('已達上限', `最多只能選擇 ${maxImages} 張圖片`);
        return;
      }

      // 選擇圖片（允許多選）
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // ✅ Step 1: 轉換所有圖片為 JPG（處理 iOS HEIC 格式）
      const assetsToProcess = result.assets.slice(0, remaining);
      const processedAssets = await normalizeImagesToJpg(assetsToProcess);

      if (processedAssets.length === 0) {
        return;
      }

      // 檢查檔案大小和數量（已轉換為 JPG）
      const validImages: string[] = [];
      for (let i = 0; i < processedAssets.length && validImages.length < remaining; i++) {
        const asset = processedAssets[i];
        
        // 檢查檔案大小（如果可用）
        if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
          Alert.alert('檔案過大', `第 ${i + 1} 張圖片超過 5MB，已跳過`);
          continue;
        }

        validImages.push(asset.uri);
      }

      if (validImages.length > 0) {
        console.log('[ImagePickerGrid] Selected images (converted to JPG):', validImages);
        onImagesChange([...images, ...validImages]);
      }
    } catch (error: any) {
      console.error('[ImagePickerGrid] Error:', error);
      Alert.alert('錯誤', error.message || '選擇圖片時發生錯誤');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          商品參考圖片
        </Text>
        <Text style={styles.countText}>
          {images.length}/{maxImages} 張
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 添加按鈕 */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImages}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color={colors.textMuted} />
            <Text style={styles.addButtonText}>添加</Text>
          </TouchableOpacity>
        )}

        {/* 圖片列表 */}
        {images.map((uri, index) => {
          // Debug log for first image
          if (index === 0) {
            console.log('[ImagePickerGrid] Rendering first image:', {
              uri,
              uriType: typeof uri,
              uriLength: uri?.length,
            });
          }

          // 確保 URI 格式正確
          // expo-image-picker 在 iOS 上返回的 URI 已經是完整路徑
          // 在 Android 上可能需要 file:// 前綴，但通常 expo-image-picker 已經處理好了
          const imageUri = uri || '';
          
          // Debug: 驗證 URI 格式
          if (index === 0 && !imageUri) {
            console.warn('[ImagePickerGrid] Empty URI for image at index 0');
          }

          return (
            <View key={`image-${index}-${uri}`} style={styles.imageContainer}>
              <ExpoImage
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                onError={(error) => {
                  console.error(`[ImagePickerGrid] Image ${index} load error:`, {
                    uri: imageUri,
                    error,
                  });
                }}
                onLoad={() => {
                  if (index === 0) {
                    console.log(`[ImagePickerGrid] Image ${index} loaded successfully:`, imageUri);
                  }
                }}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  countText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scrollContent: {
    paddingRight: spacing.md,
  },
  addButton: {
    width: 100,
    height: 100,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  imageContainer: {
    width: 100,
    height: 100,
    marginRight: spacing.md,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
  },
});

