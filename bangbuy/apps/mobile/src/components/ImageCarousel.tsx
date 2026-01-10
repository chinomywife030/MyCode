/**
 * ImageCarousel - 使用 react-native-reanimated-carousel 的圖片輪播組件
 * 
 * 功能：
 * - 支援左右滑動瀏覽多張圖片
 * - 只在多張圖片時顯示 dots 指示器
 * - 單張圖片或無圖片時回退為單張顯示
 * - 完全保持原有圖片區的尺寸、比例、圓角、裁切方式
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { colors } from '@/src/theme/tokens';

interface ImageCarouselProps {
  /** 圖片 URL 陣列 */
  images: string[];
  /** 圖片容器的寬度（由父組件提供） */
  width: number;
  /** 圖片容器的高度（由父組件提供） */
  height: number;
  /** 是否顯示 indicator（預設：只在多張圖片時顯示） */
  showIndicator?: boolean;
  /** 無圖片時的 placeholder icon size */
  placeholderIconSize?: number;
}

export function ImageCarousel({
  images,
  width,
  height,
  showIndicator,
  placeholderIconSize = 40,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 若沒有圖片，顯示 placeholder
  if (!images || images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={placeholderIconSize} color={colors.textMuted} />
        </View>
      </View>
    );
  }

  // 若只有一張圖片，不顯示 carousel 和 indicator
  if (images.length === 1) {
    return (
      <View style={styles.container}>
        <ExpoImage
          source={{ uri: images[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  // 多張圖片：使用 reanimated-carousel
  // 注意：width 和 height 必須是實際數值（來自父容器的 onLayout）
  const shouldShowIndicator = showIndicator !== undefined ? showIndicator : true;

  // 如果還沒有尺寸，不渲染 carousel（避免錯誤）
  if (width <= 0 || height <= 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Carousel
        loop={false}
        width={width}
        height={height}
        data={images}
        onSnapToItem={(index) => setCurrentIndex(index)}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <ExpoImage
              source={{ uri: item }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}
        enabled
      />

      {/* Dots Indicator - 只在多張圖片且 showIndicator 為 true 時顯示 */}
      {shouldShowIndicator && images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden', // 確保圓角和裁切正常
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  // Dots indicator
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});

export default ImageCarousel;

