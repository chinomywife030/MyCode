import { StyleSheet, View, TouchableOpacity, Text, Animated, LayoutChangeEvent } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { type Mode } from '@/src/ui/ModeToggle';

interface RoleSwitchProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

/**
 * 身分切換元件 - 膠囊狀 Segmented Control
 * 支援買家 (buyer) 和代購 (shopper) 模式切換
 * 使用 Animated API 實現平滑的滑動和顏色過渡動畫
 */
export function RoleSwitch({ mode, onChange }: RoleSwitchProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [segmentWidth, setSegmentWidth] = useState(0);
  
  // 動畫值
  // shopper = 0 (左側，橘色), buyer = 1 (右側，藍色)
  const translateX = useRef(new Animated.Value(mode === 'shopper' ? 0 : 1)).current;
  const orangeOpacity = useRef(new Animated.Value(mode === 'shopper' ? 1 : 0)).current;
  const blueOpacity = useRef(new Animated.Value(mode === 'buyer' ? 1 : 0)).current;

  // 當 mode 改變時，觸發動畫
  useEffect(() => {
    const targetValue = mode === 'shopper' ? 0 : 1;
    
    Animated.parallel([
      // Indicator 位置動畫
      Animated.timing(translateX, {
        toValue: targetValue,
        duration: 250,
        useNativeDriver: true,
      }),
      // 橘色透明度動畫（shopper）
      Animated.timing(orangeOpacity, {
        toValue: mode === 'shopper' ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
      // 藍色透明度動畫（buyer）
      Animated.timing(blueOpacity, {
        toValue: mode === 'buyer' ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  // 計算 Indicator 的 translateX 值
  const indicatorTranslateX = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth || 0],
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    // 每個 segment 的寬度 = (總寬度 - padding * 2) / 2
    // padding 是 4，所以左右各 4，總共 8
    const calculatedSegmentWidth = (width - 8) / 2;
    setSegmentWidth(calculatedSegmentWidth);
  };

  const handlePress = (newMode: Mode) => {
    if (newMode !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(newMode);
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
    >
      {/* 滑動 Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: segmentWidth || 0,
            transform: [{ translateX: indicatorTranslateX }],
          },
        ]}
      >
        {/* 橘色層（shopper） */}
        <Animated.View
          style={[
            styles.indicatorColor,
            styles.indicatorOrange,
            { opacity: orangeOpacity },
          ]}
        />
        {/* 藍色層（buyer） */}
        <Animated.View
          style={[
            styles.indicatorColor,
            styles.indicatorBlue,
            { opacity: blueOpacity },
          ]}
        />
      </Animated.View>

      {/* 選項按鈕 */}
      <View style={styles.segmentsContainer}>
        <TouchableOpacity
          style={styles.segment}
          onPress={() => handlePress('shopper')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              mode === 'shopper' && styles.segmentTextActive,
            ]}
          >
            代購
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.segment}
          onPress={() => handlePress('buyer')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              mode === 'buyer' && styles.segmentTextActive,
            ]}
          >
            買家
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderRadius: 999,
    padding: 4,
    backgroundColor: '#F2F3F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    flexDirection: 'row',
  },
  segmentsContainer: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 36,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  indicatorColor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
  },
  indicatorBlue: {
    backgroundColor: '#1E78FF',
  },
  indicatorOrange: {
    backgroundColor: '#FF7A00',
  },
});
