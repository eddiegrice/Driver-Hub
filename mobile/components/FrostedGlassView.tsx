/**
 * High-end glassmorphism surface: blur (intensity 20) + rgba(255,255,255,0.07) overlay.
 * Replaces solid grey backgrounds for a frosted glass look.
 */
import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { NeoGlass } from '@/constants/theme';

const FROSTED_OVERLAY = NeoGlass.frostedOverlay;
const BLUR_INTENSITY = 20;

type FrostedGlassViewProps = PropsWithChildren<{
  style?: object;
  borderRadius?: number;
}>;

export function FrostedGlassView({ children, style, borderRadius = 0 }: FrostedGlassViewProps) {
  const containerStyle = [styles.container, borderRadius > 0 && { borderRadius }];

  return (
    <View style={[containerStyle, style]} collapsable={false}>
      <BlurView
        intensity={BLUR_INTENSITY}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.overlay, borderRadius > 0 && { borderRadius }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FROSTED_OVERLAY,
  },
  content: {
    flex: 1,
  },
});
