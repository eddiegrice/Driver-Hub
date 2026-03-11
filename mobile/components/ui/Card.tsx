import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';

type CardProps = PropsWithChildren<{
  /** Optional left accent bar (brand color) */
  accent?: boolean;
  /** Slightly elevated (shadow / darker surface in dark mode) */
  elevated?: boolean;
  style?: object;
}>;

export function Card({ children, accent, elevated, style }: CardProps) {
  const backgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'background'
  );
  const elevatedBg = useThemeColor(
    { light: '#FFFFFF', dark: '#334155' },
    'background'
  );
  const accentColor = useThemeColor(
    { light: '#0D5C63', dark: '#D4A012' },
    'tint'
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: elevated ? elevatedBg : backgroundColor },
        elevated && styles.elevated,
        style,
      ]}>
      {accent && <View style={[styles.accent, { backgroundColor: accentColor }]} />}
      <View style={accent ? styles.contentWithAccent : styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  content: {
    padding: Spacing.lg,
  },
  contentWithAccent: {
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 6,
  },
});
