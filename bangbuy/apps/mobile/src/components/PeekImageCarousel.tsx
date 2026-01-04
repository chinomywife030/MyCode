import React, { useMemo, useState } from "react";
import { View, StyleSheet, FlatList, LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";

type Props = {
  images: string[];
  aspectRatio?: number;
  gap?: number;
  peek?: number;
};

export function PeekImageCarousel({
  images,
  aspectRatio = 4 / 3,
  gap = 10,
  peek = 32,
}: Props) {
  const data = useMemo(() => images ?? [], [images]);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w && w !== containerWidth) setContainerWidth(w);
  };

  if (!data.length) {
    return <View style={[styles.placeholder, { aspectRatio }]} />;
  }

  const itemWidth = Math.max(220, containerWidth ? containerWidth - peek : 220);
  const snapInterval = itemWidth + gap;

  return (
    <View onLayout={onLayout} style={[styles.ratioBox, { aspectRatio }]}>
      {containerWidth > 0 ? (
        <FlatList
          data={data}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: gap }} />}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          renderItem={({ item }) => (
            <View style={{ width: itemWidth }}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="cover"
                transition={120}
              />
            </View>
          )}
        />
      ) : (
        <View style={[styles.placeholder, { aspectRatio }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ratioBox: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F4F7",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F2F4F7",
  },
});
