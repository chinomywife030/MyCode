/**
 * ImmoImageCarousel - 多圖輪播組件
 * 支援左右滑動、paging、indicator 顯示
 * 
 * 若圖片數量為 0 或 1，回退成單張顯示（不顯示 indicator）
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  immoColors,
  immoSpacing,
  immoRadius,
  immoTypography,
} from './theme';

interface ImmoImageCarouselProps {
  /** 圖片 URL 陣列 */
  images: string[];
  /** 圖片容器的寬高比（預設 4:3） */
  aspectRatio?: number;
  /** 是否顯示 indicator（預設 true） */
  showIndicator?: boolean;
  /** Indicator 類型：dots（圓點）或 counter（計數器 1/5） */
  indicatorType?: 'dots' | 'counter';
  /** 圖片載入失敗時的 placeholder icon size */
  placeholderIconSize?: number;
}

export function ImmoImageCarousel({
  images,
  aspectRatio = 4 / 3,
  showIndicator = true,
  indicatorType = 'dots',
  placeholderIconSize = 40,
}: ImmoImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // 獲取螢幕寬度（用於計算卡片內圖片寬度）
  // 注意：這裡使用父容器寬度，但由於 ScrollView 需要固定寬度，我們用 onLayout 取得實際寬度
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / containerWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  // 若沒有圖片，顯示 placeholder
  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { aspectRatio }]} onLayout={handleLayout}>
        <View style={styles.placeholder}>
          <Ionicons name="image-outline" size={placeholderIconSize} color={immoColors.textMuted} />
        </View>
      </View>
    );
  }

  // 若只有一張圖片，不顯示 indicator
  if (images.length === 1) {
    const imageUri = images[0];
    const isValidUri = imageUri && (imageUri.startsWith('http://') || imageUri.startsWith('https://'));

    return (
      <View style={[styles.container, { aspectRatio }]} onLayout={handleLayout}>
        {isValidUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
            onError={(error) => {
              console.error('[ImmoImageCarousel] Image load error:', {
                uri: imageUri,
                error: error.nativeEvent?.error || error,
              });
            }}
            onLoad={() => {
              console.log('[ImmoImageCarousel] Image loaded successfully:', imageUri);
            }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={placeholderIconSize} color={immoColors.textMuted} />
          </View>
        )}
      </View>
    );
  }

  // 多張圖片：顯示可滑動的輪播
  return (
    <View style={[styles.container, { aspectRatio }]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
      >
        {images.map((uri, index) => {
          const isValidUri = uri && (uri.startsWith('http://') || uri.startsWith('https://'));
          
          return (
            <View key={`${uri}-${index}`} style={{ width: containerWidth }}>
              {isValidUri ? (
                <ExpoImage
                  source={{ uri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                  onError={(error) => {
                    console.error('[ImmoImageCarousel] Image load error:', {
                      uri,
                      index,
                      error: error.nativeEvent?.error || error,
                    });
                  }}
                  onLoad={() => {
                    console.log('[ImmoImageCarousel] Image loaded successfully:', uri);
                  }}
                />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="image-outline" size={placeholderIconSize} color={immoColors.textMuted} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Indicator */}
      {showIndicator && (
        indicatorType === 'dots' ? (
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
        ) : (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: immoColors.background,
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: immoColors.background,
  },
  // Dots indicator
  dotsContainer: {
    position: 'absolute',
    bottom: immoSpacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: immoSpacing.xs,
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
    backgroundColor: immoColors.white,
  },
  // Counter indicator
  counterContainer: {
    position: 'absolute',
    bottom: immoSpacing.sm,
    right: immoSpacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: immoSpacing.sm,
    paddingVertical: immoSpacing.xs,
    borderRadius: immoRadius.sm,
  },
  counterText: {
    fontSize: immoTypography.fontSize.xs,
    fontWeight: immoTypography.fontWeight.medium,
    color: immoColors.white,
  },
});

export default ImmoImageCarousel;



