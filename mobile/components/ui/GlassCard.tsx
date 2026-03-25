/**
 * Neo-Glass card: frosted glass (blur + overlay), 1px border, large radius.
 * Optional gradient border for e.g. Active Membership card.
 */
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FrostedGlassView } from '@/components/FrostedGlassView';
import { MembershipCardBorderGradient, NeoGlass, Radius } from '@/constants/theme';

type GlassCardProps = PropsWithChildren<{
  elevated?: boolean;
  /** Gradient border (e.g. Active Membership card): #00ccff → #1a0033 */
  gradientBorder?: boolean;
  /** Override default card radius (e.g. Radius.lg to match glass menu box) */
  borderRadius?: number;
  /** Override border color (e.g. rgba(255,255,255,0.1) for light edge) */
  borderColor?: string;
  /** Override inner content padding */
  contentStyle?: object;
  /** Smoked glass: lighter overlay (0.03) and blur 12 so gradient bleeds through */
  sleek?: boolean;
  style?: object;
}>;

const SLEEK_OVERLAY = 'rgba(255, 255, 255, 0.03)';
const SLEEK_BLUR = 12;

export function GlassCard({ children, elevated, gradientBorder, borderRadius, borderColor, contentStyle, sleek, style }: GlassCardProps) {
  const cardBorderRadius = borderRadius ?? Radius.card;
  const borderWidth = 1;
  const resolvedBorderColor = borderColor ?? NeoGlass.cardBorder;
  const frostedProps = sleek ? { intensity: SLEEK_BLUR, overlayColor: SLEEK_OVERLAY } : {};

  if (gradientBorder) {
    return (
      <View style={[styles.gradientBorderWrap, style]}>
        <LinearGradient
          colors={MembershipCardBorderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { borderRadius: cardBorderRadius + borderWidth }]}
        />
        <View style={[styles.gradientInner, { borderRadius: cardBorderRadius }]}>
          <FrostedGlassView borderRadius={cardBorderRadius} style={styles.frosted} {...frostedProps}>
            <View style={[styles.content, contentStyle]}>{children}</View>
          </FrostedGlassView>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: cardBorderRadius,
          borderWidth,
          borderColor: resolvedBorderColor,
        },
        style,
      ]}>
      <FrostedGlassView borderRadius={cardBorderRadius - borderWidth} style={styles.frosted} {...frostedProps}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </FrostedGlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
    minHeight: 1,
  },
  gradientBorderWrap: {
    position: 'relative',
    padding: 1,
    minHeight: 1,
  },
  gradientBorder: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientInner: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  frosted: {
    flex: 1,
    minHeight: 1,
  },
  content: {
    padding: 24,
  },
});
