import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList, Dimensions, Text } from "react-native";
import { Image } from "expo-image";

const RADIUS = 16;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function WishHeroCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const data = useMemo(() => (images?.length ? images : []), [images]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) setIndex(viewableItems[0].index ?? 0);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  if (!data.length) {
    return <View style={styles.placeholderBox} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.ratioBox}>
        <FlatList
          data={data}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            // Debug: 验证 URL 格式
            if (!item || !item.startsWith('http://') && !item.startsWith('https://')) {
              console.warn('[WishHeroCarousel] Invalid image URL:', item);
            }

            return (
              <View style={styles.imageWrapper}>
                {item && (item.startsWith('http://') || item.startsWith('https://')) ? (
                  <Image
                    source={{ uri: item }}
                    style={styles.image}
                    contentFit="cover"
                    transition={150}
                    placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                    onError={(error) => {
                      console.error('[WishHeroCarousel] Image load error:', {
                        uri: item,
                        error: error.nativeEvent?.error || error,
                      });
                    }}
                    onLoad={() => {
                      console.log('[WishHeroCarousel] Image loaded successfully:', item);
                    }}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>圖片無法載入</Text>
                  </View>
                )}
              </View>
            );
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH - 32, // 减去左右 padding
            offset: (SCREEN_WIDTH - 32) * index,
            index,
          })}
        />
      </View>

      {data.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1}/{data.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ratioBox: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: "#F2F4F7",
  },
  imageWrapper: {
    width: SCREEN_WIDTH - 32, // 减去左右 padding (16 * 2)
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    marginHorizontal: 16,
    marginTop: 12,
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: RADIUS,
    backgroundColor: "#F2F4F7",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2F4F7",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 14,
  },
  counter: {
    position: "absolute",
    right: 24,
    bottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

