// App.js (Expo Snack)
// Assets required:
// - ../assets/images/bag-empty.png
// - ../assets/images/bag-final.png
// - ../assets/images/airplane.png

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Module-level guard (Singleton pattern for app session)
let hasSplashPlayed = false;

const BAG_EMPTY = require("../assets/images/bag-empty.png");
const BAG_FINAL = require("../assets/images/bag-final.png");
const PLANE = require("../assets/images/airplane.png");

// ✅ Global speed multiplier (does NOT change CONFIG.DURATION values)
// 1.0 = original speed, 0.75 = 25% faster, 0.6 = very fast
const TIME_SCALE = 0.65;

// Minimum display time for splash screen (ms)
const MIN_SHOW_MS = 1800;

const { width: W, height: H } = Dimensions.get("window");

const CONFIG = {
  DURATION: {
    HOLD_START: 300,
    BANG_REVEAL: 720,
    GAP_1: 120,
    BUY_REVEAL: 420,
    BUY_PUNCH_UP: 520,
    JELLY_TOTAL: 520,
    HOLD_AFTER_JELLY: 250,

    PLANE_ACROSS_TEXT: 1150,
    GAP_2: 150,

    ICON_IN: 650,
    TEXT_TO_ICON: 900,
    PLANE_TO_TAG: 950,

    POP_UP: 120,
    POP_DOWN: 140,
    SWAP: 220,

    HOLD_END: 650,
  },

  BAG_W: 320,
  PLANE_RATIO: 0.22,

  LAYOUT: {
    HEADLINE_CX: 0.5,
    HEADLINE_CY: 0.33,
    LINE_GAP: 0,

    ICON_CX: 0.5,
    ICON_CY: 0.58,

    WORDMARK_OFFSET_Y: -20,

    // ✅ Move final icon + wordmark together
    FINAL_SHIFT_Y: -250,
  },

  COLOR: { BANG: "#2F6FEA", BUY: "#FF8A00" },

  BUY_PUNCH: {
    FROM_BELOW_PX: 100,
    OVERSHOOT_PX: -50,
    BANG_NUDGE_PX: -11,
  },

  JELLY: {
    SX_MAX: 1.06,
    SX_MIN: 0.98,
    SY_MIN: 0.96,
    SY_MAX: 1.02,
  },

  PLANE: {
    ANCHOR: { x: 0.5, y: 0.5 },
    ACROSS_START: { x: -1.2, y: 0.25 },
    ACROSS_END: { x: 0.68, y: 0.27 },
    ACROSS_ARC: 0.08,
    ROTATE_START: 16,
    ROTATE_END: 0,
    TAG_ANCHOR: { x: 0.764, y: 0.2819 },
  },

  POP: { SCALE: 1.06 },
};

// Type definitions
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type ViewRef = React.ElementRef<typeof View>;

function sampleBezier(p0: Point, p1: Point, p2: Point, samples: number = 44) {
  const tSamples = [];
  const xSamples = [];
  const ySamples = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const one = 1 - t;
    tSamples.push(t);
    xSamples.push(one * one * p0.x + 2 * one * t * p1.x + t * t * p2.x);
    ySamples.push(one * one * p0.y + 2 * one * t * p1.y + t * t * p2.y);
  }
  // clamp end
  xSamples[xSamples.length - 1] = p2.x;
  ySamples[ySamples.length - 1] = p2.y;
  return { tSamples, xSamples, ySamples };
}

interface SplashAnimationProps {
  onFinish?: () => void;
}

export default function App(props: SplashAnimationProps = {}) {
  const { onFinish } = props;
  // Headline animation
  const bangReveal = useRef(new Animated.Value(0)).current;
  const buyReveal = useRef(new Animated.Value(0)).current;
  const buyPunch = useRef(new Animated.Value(0)).current;
  const jelly = useRef(new Animated.Value(0)).current;

  // Plane / icon segment
  const planeAcross = useRef(new Animated.Value(0)).current;
  const planeToTag = useRef(new Animated.Value(0)).current;
  const planeHide = useRef(new Animated.Value(0)).current; // 0 visible, 1 hidden

  const iconIn = useRef(new Animated.Value(0)).current;
  const textToIcon = useRef(new Animated.Value(0)).current;

  const pop = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(0)).current;

  // measure bag for tag landing
  const bagRef = useRef<ViewRef>(null);
  const [bagRect, setBagRect] = useState<Rect | null>(null);

  // StrictMode protection: prevent duplicate animation starts
  const startedRef = useRef(false);
  // Ensure onFinish is only called once
  const finishedRef = useRef(false);
  // Track animation start time for minimum display duration
  const startTimeRef = useRef<number | null>(null);

  const bagSrc = Image.resolveAssetSource(BAG_EMPTY);
  const BAG_W = CONFIG.BAG_W;
  const BAG_H = Math.round((BAG_W * bagSrc.height) / bagSrc.width);
  const PLANE_W = Math.round(BAG_W * CONFIG.PLANE_RATIO);
  const PLANE_H = PLANE_W;

  const measureBag = () => {
    if (!bagRef.current) return;
    bagRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (w > 0 && h > 0) setBagRect({ x, y, w, h });
    });
  };

  useEffect(() => {
    const t = setTimeout(measureBag, 60);
    return () => clearTimeout(t);
  }, []);

  // Layout positions
  const headlineCx = W * CONFIG.LAYOUT.HEADLINE_CX;
  const headlineCy = H * CONFIG.LAYOUT.HEADLINE_CY;

  const iconCx = W * CONFIG.LAYOUT.ICON_CX;
  const iconCy = H * CONFIG.LAYOUT.ICON_CY + CONFIG.LAYOUT.FINAL_SHIFT_Y;

  // Text reveal widths
  const LINE_W = Math.min(W * 0.82, 540);
  const WORDMARK_W = Math.min(W * 0.86, 560);

  const bangClipW = bangReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LINE_W],
  });
  const buyClipW = buyReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LINE_W],
  });

  // ✅ Bang "pop-in" (uses existing bangReveal; no new Animated.Value)
  const bangPopY = bangReveal.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [18, -4, 0],
    extrapolate: "clamp",
  });

  const bangPopScale = bangReveal.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.98, 1.03, 1],
    extrapolate: "clamp",
  });

  const bangPopOpacity = bangReveal.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 1],
    extrapolate: "clamp",
  });

  // Buy punch / bang nudge
  const buyTranslateY = buyPunch.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [
      CONFIG.BUY_PUNCH.FROM_BELOW_PX,
      CONFIG.BUY_PUNCH.OVERSHOOT_PX,
      0,
    ],
  });

  const bangNudgeY = buyPunch.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0, CONFIG.BUY_PUNCH.BANG_NUDGE_PX, 0],
  });

  // Jelly
  const jellySX = jelly.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, CONFIG.JELLY.SX_MAX, CONFIG.JELLY.SX_MIN, 1.03, 1],
  });
  const jellySY = jelly.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, CONFIG.JELLY.SY_MIN, CONFIG.JELLY.SY_MAX, 0.99, 1],
  });

  // Icon in
  const iconOpacity = iconIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const iconScale = iconIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  // Move headline to icon bottom & fade into wordmark
  const textMoveY = textToIcon.interpolate({
    inputRange: [0, 1],
    outputRange: [0, iconCy - headlineCy + CONFIG.LAYOUT.WORDMARK_OFFSET_Y],
  });

  const headlineOpacity = textToIcon.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.15, 0],
    extrapolate: "clamp",
  });

  const wordmarkOpacity = textToIcon.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.25, 1],
    extrapolate: "clamp",
  });

  const wordmarkClipW = textToIcon.interpolate({
    inputRange: [0.35, 1],
    outputRange: [0, WORDMARK_W],
    extrapolate: "clamp",
  });

  // Pop + swap
  const popScale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, CONFIG.POP.SCALE],
  });
  const bagEmptyOpacity = swap.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const bagFinalOpacity = swap.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Plane opacity control (final appears => plane disappears)
  const planeGlobalOpacity = planeHide.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // ----- Plane path: across headline -----
  // ✅ J-curve from left-bottom to right-top (like your drawing)
  const acrossGeo = useMemo(() => {
    const textLeft = headlineCx - LINE_W / 2;
    const textRight = headlineCx + LINE_W / 2;

    // 你自己加在 acrossGeo 裡
    const START_OFFSET_X = -PLANE_W * 1.2; // 越負 = 越往左
    const START_OFFSET_Y = +110; // 越大 = 越往下

    const startX = textLeft + START_OFFSET_X;
    const startY = headlineCy - 44 + START_OFFSET_Y;

    const END_OFFSET_X = -PLANE_W * 0.85; // 越大(更正) = 更往右，越負 = 更往左
    const END_OFFSET_Y = 3; // 越負 = 越往上，越正 = 越往下

    const endX = textRight + END_OFFSET_X;
    const endY = headlineCy - 44 + END_OFFSET_Y;

    const sx = startX - PLANE_W * CONFIG.PLANE.ANCHOR.x;
    const sy = startY - PLANE_H * CONFIG.PLANE.ANCHOR.y;
    const ex = endX - PLANE_W * CONFIG.PLANE.ANCHOR.x;
    const ey = endY - PLANE_H * CONFIG.PLANE.ANCHOR.y;

    // Control point to create a "hook" (J)
    const dx = ex - sx;
    const dy = ey - sy;

    const cx = sx + dx * 0.28;
    const cy = sy + dy * 0.28 + 180; // increase => more "hook"

    return { sx, sy, ex, ey, cx, cy };
  }, [PLANE_W, PLANE_H, headlineCx, headlineCy, LINE_W]);

  const acrossSamples = useMemo(() => {
    return sampleBezier(
      { x: acrossGeo.sx, y: acrossGeo.sy },
      { x: acrossGeo.cx, y: acrossGeo.cy },
      { x: acrossGeo.ex, y: acrossGeo.ey }
    );
  }, [acrossGeo]);

  const planeAcrossX = planeAcross.interpolate({
    inputRange: acrossSamples.tSamples,
    outputRange: acrossSamples.xSamples,
  });
  const planeAcrossY = planeAcross.interpolate({
    inputRange: acrossSamples.tSamples,
    outputRange: acrossSamples.ySamples,
  });

  const planeRotateAcross = planeAcross.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `${CONFIG.PLANE.ROTATE_START}deg`,
      `${CONFIG.PLANE.ROTATE_END}deg`,
    ],
  });

  // ----- Plane path: to tag -----
  // ✅ existing logic kept (smooth to tag)
  const toTagSamples = useMemo(() => {
    const start = { x: acrossGeo.ex, y: acrossGeo.ey };

    let end = { x: acrossGeo.ex, y: acrossGeo.ey };
    if (bagRect) {
      const tagX = bagRect.x + bagRect.w * CONFIG.PLANE.TAG_ANCHOR.x;
      const tagY = bagRect.y + bagRect.h * CONFIG.PLANE.TAG_ANCHOR.y;
      end = {
        x: tagX - PLANE_W * CONFIG.PLANE.ANCHOR.x,
        y: tagY - PLANE_H * CONFIG.PLANE.ANCHOR.y,
      };
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy) || 1;

    const nx = -dy / dist;
    const ny = dx / dist;

    const bend = Math.max(18, Math.min(60, dist * 0.22));

    const t = 0.55;
    const ctrl = {
      x: start.x + dx * t + nx * bend,
      y: start.y + dy * t + ny * bend,
    };

    return sampleBezier(start, ctrl, end);
  }, [acrossGeo.ex, acrossGeo.ey, bagRect, PLANE_W, PLANE_H]);

  const planeToTagX = planeToTag.interpolate({
    inputRange: toTagSamples.tSamples,
    outputRange: toTagSamples.xSamples,
  });
  const planeToTagY = planeToTag.interpolate({
    inputRange: toTagSamples.tSamples,
    outputRange: toTagSamples.ySamples,
  });

  const planeRotateToTag = planeToTag.interpolate({
    inputRange: [0, 1],
    outputRange: ["8deg", "0deg"],
  });

  // Switch between two plane instances
  const planeAcrossOpacity = planeToTag.interpolate({
    inputRange: [0, 0.06],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const planeToTagOpacity = planeToTag.interpolate({
    inputRange: [0, 0.06],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ===== "Trail" WITHOUT SVG: 3 ghost planes following the across motion =====
  // This avoids react-native-svg dependency and works in Snack.
  const trailBaseOpacity = planeAcross.interpolate({
    inputRange: [0, 0.06, 0.92, 1],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp",
  });
  const trailGlobalOpacity = Animated.multiply(planeGlobalOpacity, trailBaseOpacity);

  const trail1Opacity = trailGlobalOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });
  const trail2Opacity = trailGlobalOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.22],
  });
  const trail3Opacity = trailGlobalOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.12],
  });

  // Slight offsets to simulate a drawn trail (visually reads as a curve)
  const trail1X = Animated.add(planeAcrossX, -14);
  const trail1Y = Animated.add(planeAcrossY, 10);

  const trail2X = Animated.add(planeAcrossX, -28);
  const trail2Y = Animated.add(planeAcrossY, 20);

  const trail3X = Animated.add(planeAcrossX, -44);
  const trail3Y = Animated.add(planeAcrossY, 30);

  const trail1Scale = planeAcross.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 0.94],
  });
  const trail2Scale = planeAcross.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 0.90],
  });
  const trail3Scale = planeAcross.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 0.86],
  });

  // Ensure onFinish is only called once
  const finishOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (!onFinish) return;

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);

    if (remaining > 0) {
      // Delay onFinish to ensure minimum display time
      setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
      }, remaining);
    } else {
      // Already exceeded minimum display time, call immediately
      onFinish();
    }
  };

  // Run animation
  useEffect(() => {
    if (!bagRect) return;

    // StrictMode protection: prevent duplicate animation starts
    if (startedRef.current) return;
    
    // Prevent re-playing if component is re-mounted
    if (hasSplashPlayed) {
      console.log('[Splash] Animation already played in this session, skipping and finishing immediately');
      if (onFinish) onFinish();
      return;
    }

    startedRef.current = true;
    hasSplashPlayed = true;
    console.log('[Splash] startAnimation');

    // Record animation start time
    startTimeRef.current = Date.now();

    // reset
    bangReveal.setValue(0);
    buyReveal.setValue(0);
    buyPunch.setValue(0);
    jelly.setValue(0);

    planeAcross.setValue(0);
    planeToTag.setValue(0);
    planeHide.setValue(0);

    iconIn.setValue(0);
    textToIcon.setValue(0);

    pop.setValue(0);
    swap.setValue(0);

    const D = CONFIG.DURATION;

    // ✅ runtime time scaling (keeps CONFIG.DURATION unchanged)
    const T = (ms: number) => Math.max(1, Math.round(ms * TIME_SCALE));

    Animated.sequence([
      Animated.delay(T(D.HOLD_START)),

      Animated.timing(bangReveal, {
        toValue: 1,
        duration: T(D.BANG_REVEAL),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),

      Animated.delay(T(D.GAP_1)),

      Animated.parallel([
        Animated.timing(buyReveal, {
          toValue: 1,
          duration: T(D.BUY_REVEAL),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(buyPunch, {
          toValue: 1,
          duration: T(D.BUY_PUNCH_UP),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(jelly, {
        toValue: 1,
        duration: T(D.JELLY_TOTAL),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Must be false: jellySX/jellySY used in same style as JS-driven textToIcon values (headlineOpacity, textMoveY)
      }),

      Animated.delay(T(D.HOLD_AFTER_JELLY)),

      // ✅ Plane across headline (now J-curve + "ghost trail")
      Animated.timing(planeAcross, {
        toValue: 1,
        duration: T(D.PLANE_ACROSS_TEXT),
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.delay(T(D.GAP_2)),

      // ✅ Icon in + move text + plane to tag (parallel)
      Animated.parallel([
        Animated.timing(iconIn, {
          toValue: 1,
          duration: T(D.ICON_IN),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textToIcon, {
          toValue: 1,
          duration: T(D.TEXT_TO_ICON),
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false, // Must be false: textToIcon affects width (wordmarkClipW)
        }),
        Animated.timing(planeToTag, {
          toValue: 1,
          duration: T(D.PLANE_TO_TAG),
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ✅ Landing: pop + swap + hide plane when final appears
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pop, {
            toValue: 1,
            duration: T(D.POP_UP),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pop, {
            toValue: 0,
            duration: T(D.POP_DOWN),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(swap, {
          toValue: 1,
          duration: T(D.SWAP),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(planeHide, {
          toValue: 1,
          duration: T(Math.max(120, Math.floor(D.SWAP * 0.7))),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(T(D.HOLD_END)),
    ]).start((finished) => {
      if (finished) {
        finishOnce();
      }
    });
  }, [bagRect, onFinish]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.stage} onLayout={measureBag}>
        {/* HEADLINE */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.headlineWrap,
            {
              left: headlineCx,
              top: headlineCy,
              opacity: headlineOpacity,
              transform: [
                { translateX: -LINE_W / 2 },
                { translateY: -44 },
                { translateY: textMoveY },
                { scaleX: jellySX },
                { scaleY: jellySY },
              ],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ translateY: bangNudgeY }] }}>
            <View style={{ width: LINE_W, alignItems: "center", overflow: "hidden" }}>
              <Animated.View style={{ width: bangClipW, overflow: "hidden" }}>
                {/* ✅ only change: Bang pops in */}
                <Animated.View
                  style={{
                    opacity: bangPopOpacity,
                    transform: [{ translateY: bangPopY }, { scale: bangPopScale }],
                  }}
                >
                  <Text style={[styles.headlineText, { color: CONFIG.COLOR.BANG }]}>
                    Bang
                  </Text>
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>

          <View style={{ height: CONFIG.LAYOUT.LINE_GAP }} />

          <Animated.View style={{ transform: [{ translateY: buyTranslateY }] }}>
            <View style={{ width: LINE_W, alignItems: "center", overflow: "hidden" }}>
              <Animated.View style={{ width: buyClipW, overflow: "hidden" }}>
                <Text style={[styles.headlineText, { color: CONFIG.COLOR.BUY }]}>
                  Buy
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* FINAL WORDMARK — centered and shifted with the icon */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wordmarkWrap,
            {
              top: iconCy + BAG_H / 2 + CONFIG.LAYOUT.WORDMARK_OFFSET_Y,
              opacity: wordmarkOpacity,
            },
          ]}
        >
          <Animated.View style={{ width: wordmarkClipW, overflow: "hidden" }}>
            <Text style={styles.wordmarkText}>
              <Text style={{ color: CONFIG.COLOR.BANG }}>Bang</Text>
              <Text style={{ color: CONFIG.COLOR.BUY }}>Buy</Text>
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ICON (bag) */}
        <Animated.View
          style={[
            styles.iconWrap,
            {
              left: iconCx,
              top: iconCy,
              opacity: iconOpacity,
              transform: [
                { translateX: -BAG_W / 2 },
                { translateY: -BAG_H / 2 },
                { scale: iconScale },
              ],
            },
          ]}
        >
          <View ref={bagRef} collapsable={false} style={{ width: BAG_W, height: BAG_H }}>
            <Animated.Image
              source={BAG_EMPTY}
              resizeMode="contain"
              style={[
                styles.bag,
                {
                  width: BAG_W,
                  height: BAG_H,
                  opacity: bagEmptyOpacity,
                  transform: [{ scale: popScale }],
                },
              ]}
            />
            <Animated.Image
              source={BAG_FINAL}
              resizeMode="contain"
              style={[
                styles.bag,
                {
                  width: BAG_W,
                  height: BAG_H,
                  opacity: bagFinalOpacity,
                  transform: [{ scale: popScale }],
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* "TRAIL" (ghost planes) - behind the main plane */}
        <Animated.Image
          source={PLANE}
          resizeMode="contain"
          style={[
            styles.plane,
            {
              width: PLANE_W,
              height: PLANE_H,
              opacity: Animated.multiply(trail1Opacity, planeAcrossOpacity),
              transform: [
                { translateX: trail1X },
                { translateY: trail1Y },
                { rotate: planeRotateAcross },
                { scale: trail1Scale },
              ],
            },
          ]}
        />
        <Animated.Image
          source={PLANE}
          resizeMode="contain"
          style={[
            styles.plane,
            {
              width: PLANE_W,
              height: PLANE_H,
              opacity: Animated.multiply(trail2Opacity, planeAcrossOpacity),
              transform: [
                { translateX: trail2X },
                { translateY: trail2Y },
                { rotate: planeRotateAcross },
                { scale: trail2Scale },
              ],
            },
          ]}
        />
        <Animated.Image
          source={PLANE}
          resizeMode="contain"
          style={[
            styles.plane,
            {
              width: PLANE_W,
              height: PLANE_H,
              opacity: Animated.multiply(trail3Opacity, planeAcrossOpacity),
              transform: [
                { translateX: trail3X },
                { translateY: trail3Y },
                { rotate: planeRotateAcross },
                { scale: trail3Scale },
              ],
            },
          ]}
        />

        {/* PLANE - across headline */}
        <Animated.Image
          source={PLANE}
          resizeMode="contain"
          style={[
            styles.plane,
            {
              width: PLANE_W,
              height: PLANE_H,
              opacity: Animated.multiply(planeGlobalOpacity, planeAcrossOpacity),
              transform: [
                { translateX: planeAcrossX },
                { translateY: planeAcrossY },
                { rotate: planeRotateAcross },
              ],
            },
          ]}
        />

        {/* PLANE - to tag */}
        <Animated.Image
          source={PLANE}
          resizeMode="contain"
          style={[
            styles.plane,
            {
              width: PLANE_W,
              height: PLANE_H,
              opacity: Animated.multiply(planeGlobalOpacity, planeToTagOpacity),
              transform: [
                { translateX: planeToTagX },
                { translateY: planeToTagY },
                { rotate: planeRotateToTag },
              ],
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  stage: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  headlineWrap: { position: "absolute" },
  headlineText: {
    fontSize: 72,
    fontWeight: "800",
    letterSpacing: 0.4,
    textAlign: "center",
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
    }),
  },

  wordmarkWrap: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
  },
  wordmarkText: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "SF Pro Display",
      android: "sans-serif",
    }),
  },

  iconWrap: { position: "absolute" },
  bag: { position: "absolute", left: 0, top: 0 },

  plane: { position: "absolute", left: 0, top: 0 },
});
