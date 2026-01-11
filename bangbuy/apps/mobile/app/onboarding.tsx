import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, radius } from '@/src/theme/tokens';
import { setHasSeenOnboarding } from '@/src/lib/onboarding';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string | string[];
  isList?: boolean;
  reminder?: string;
  reminderNote?: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'handshake-outline',
    title: '歡迎來到 BangBuy',
    content: '連結想買的人與願意幫忙代購的人',
  },
  {
    id: '2',
    icon: 'bag-outline',
    title: '發布需求，找人幫你帶',
    content: [
      '說明你想買的商品',
      '等待願意幫忙的人聯絡',
      '私訊確認後完成交易',
    ],
    isList: true,
  },
  {
    id: '3',
    icon: 'airplane-outline',
    title: '發布行程，幫別人帶東西',
    content: [
      '分享你的旅行行程',
      '接受代購請求',
      '賺取代購費',
    ],
    isList: true,
  },
  {
    id: '4',
    icon: 'camera-outline',
    title: '旅途中看到好東西？分享一下',
    content: [
      '分享你在旅途中看到的有趣商品',
      '讓其他人知道「這裡買得到」',
      '有興趣的人可以私訊你',
    ],
    isList: true,
    reminder: '小提醒：右滑可以查看更多旅途發現',
    reminderNote: '旅途發現只是分享，不代表代購承諾',
  },
  {
    id: '5',
    icon: 'chatbubbles-outline',
    title: '私訊溝通，自由完成交易',
    content: '價格與交付方式由雙方自行協調',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleSkip = async () => {
    try {
      await setHasSeenOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[OnboardingScreen] Error setting has seen onboarding:', error);
      // 即使出錯也繼續導航
      router.replace('/(tabs)');
    }
  };

  const handleGetStarted = async () => {
    try {
      await setHasSeenOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[OnboardingScreen] Error setting has seen onboarding:', error);
      router.replace('/(tabs)');
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const isLastSlide = item.id === slides[slides.length - 1].id;

    return (
      <View style={styles.slide}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={80} color={colors.brandOrange} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Content */}
        {item.isList && Array.isArray(item.content) ? (
          <View style={styles.listContainer}>
            {item.content.map((line, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.content}>{item.content}</Text>
        )}

        {/* Reminder (Slide 4) */}
        {item.reminder && (
          <View style={styles.reminderContainer}>
            <Text style={styles.reminderText}>{item.reminder}</Text>
            {item.reminderNote && (
              <Text style={styles.reminderNote}>{item.reminderNote}</Text>
            )}
          </View>
        )}

        {/* Get Started Button (Last Slide) */}
        {isLastSlide && (
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>開始使用</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipButtonText}>跳過</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCard,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'] * 2,
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    marginBottom: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 40,
  },
  content: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: spacing.lg,
  },
  listContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandOrange,
    marginTop: 8,
    marginRight: spacing.md,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.textMuted,
    lineHeight: 28,
  },
  reminderContainer: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    width: '100%',
    marginHorizontal: spacing.lg,
  },
  reminderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  reminderNote: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  getStartedButton: {
    marginTop: spacing['3xl'],
    width: '80%',
    maxWidth: 300,
    height: 55,
    backgroundColor: colors.brandOrange,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandOrange,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brandOrange,
  },
});
