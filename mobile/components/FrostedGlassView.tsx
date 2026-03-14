/**
 * High-end glassmorphism surface: blur + overlay.
 * Default: intensity 20, rgba(255,255,255,0.07) (frosted).
 * Smoked glass: intensity 10–15, rgba(255,255,255,0.03).
 */
import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { NeoGlass } from '@/constants/theme';

const FROSTED_OVERLAY = NeoGlass.frostedOverlay;
const BLUR_INTENSITY = 20;

type FrostedGlassViewProps = PropsWithChildren<{
  style?: object;
  borderRadius?: number;
  /** Blur intensity (default 20). Use 10–15 for smoked glass. */
  intensity?: number;
  /** Overlay colour (default frosted). Use rgba(255,255,255,0.03) for smoked glass. */
  overlayColor?: string;
}>;

export function FrostedGlassView({
  children,
  style,
  borderRadius = 0,
  intensity = BLUR_INTENSITY,
  overlayColor = FROSTED_OVERLAY,
}: FrostedGlassViewProps) {
  const containerStyle = [styles.container, borderRadius > 0 && { borderRadius }];

  return (
    <View style={[containerStyle, style]} collapsable={false}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.overlay, borderRadius > 0 && { borderRadius }, { backgroundColor: overlayColor }]} />
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
  },
  content: {
    flex: 1,
  },
});
