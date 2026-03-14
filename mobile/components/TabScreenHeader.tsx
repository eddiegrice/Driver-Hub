/**
 * Unified tab screen header: two faint horizontal lines with a single bold title between them.
 * Used at the top of every tab (except home) for consistent layout.
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoGlass, NeoText, Spacing } from '@/constants/theme';

const LINE_COLOR = NeoGlass.stroke;

type TabScreenHeaderProps = {
  title: string;
};

export function TabScreenHeader({ title }: TabScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.line, { backgroundColor: LINE_COLOR }]} />
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={[styles.line, { backgroundColor: LINE_COLOR }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  line: {
    height: 1,
    width: '100%',
  },
  title: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
});
