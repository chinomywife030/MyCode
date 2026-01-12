/**
 * 圖片選擇預覽組件
 * 支援多選、左右滑動預覽、刪除
 * 固定高度，不因圖片比例改變
 */

import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '@/src/theme/tokens';
import { normalizeImagesToJpg } from '@/src/utils/imageHelpers';

interface ImagePickerPreviewProps {
  images: string[]; // 圖片 URI 陣列（本地 URI）
  maxImages?: number;
  onImagesChange: (images: string[]) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = 120; // 固定寬度
const PREVIEW_ASPECT_RATIO = 4 / 3; // 4:3 比例

export function ImagePickerPreview({
  images,
  maxImages = 6,
  onImagesChange,
}: ImagePickerPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        const newImages = [...images, ...validImages];
        console.log('[ImagePickerPreview] Selected images (converted to JPG):', validImages);
        onImagesChange(newImages);
        // 滾動到最後一張
        if (newImages.length > 0) {
          setTimeout(() => {
            setCurrentIndex(newImages.length - 1);
          }, 100);
        }
      }
    } catch (error: any) {
      console.error('[ImagePickerPreview] Error:', error);
      Alert.alert('錯誤', error.message || '選擇圖片時發生錯誤');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    // 調整當前索引
    if (currentIndex >= newImages.length && newImages.length > 0) {
      setCurrentIndex(newImages.length - 1);
    }
  };

  // 準備 FlatList 資料（第一項為添加按鈕）
  const listData = images.length < maxImages 
    ? [{ type: 'add', uri: '' }, ...images.map((uri, i) => ({ type: 'image', uri, index: i }))]
    : images.map((uri, i) => ({ type: 'image', uri, index: i }));

  const renderItem = ({ item, index: itemIndex }: { item: any; index: number }) => {
    if (item.type === 'add') {
      return (
        <TouchableOpacity
          style={styles.addButton}
          onPress={pickImages}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={32} color={colors.textMuted} />
          <Text style={styles.addButtonText}>添加</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.imageItem}>
        <Image
          source={{ uri: item.uri }}
          style={styles.previewImage}
          contentFit="cover"
          transition={150}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(item.index)}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const firstVisible = viewableItems[0];
      if (firstVisible.item.type === 'image') {
        setCurrentIndex(firstVisible.item.index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>商品參考圖片</Text>
        <Text style={styles.countText}>
          {images.length}/{maxImages} 張
        </Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item, index) => 
          item.type === 'add' ? 'add-button' : `image-${item.index}-${item.uri}`
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: PREVIEW_ITEM_WIDTH + spacing.md,
          offset: (PREVIEW_ITEM_WIDTH + spacing.md) * index,
          index,
        })}
      />
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
    paddingHorizontal: spacing.lg,
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xl,
  },
  addButton: {
    width: PREVIEW_ITEM_WIDTH,
    height: PREVIEW_ITEM_WIDTH / PREVIEW_ASPECT_RATIO,
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  imageItem: {
    width: PREVIEW_ITEM_WIDTH,
    height: PREVIEW_ITEM_WIDTH / PREVIEW_ASPECT_RATIO,
    marginRight: spacing.md,
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 2,
  },
});


