import type { PropsWithChildren, ReactElement } from 'react';
import type { ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { scrollContentGutter } from '@/constants/scrollLayout';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Spacing } from '@/constants/theme';

const DEFAULT_HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement | null;
  headerBackgroundColor: { dark: string; light: string };
  /** When headerImage is null, header is 0 by default so content starts at top. Pass a number to reserve space. */
  headerHeight?: number;
  /** Merged after default scroll gutters (e.g. extra bottom inset). */
  contentStyle?: ViewStyle;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  headerHeight,
  contentStyle,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const height =
    headerHeight ?? (headerImage ? DEFAULT_HEADER_HEIGHT : 0);

  return (
    <>
      {/* Fixed strip so status bar never overlaps scrolling content */}
      <View style={[styles.statusBarFill, { height: insets.top, backgroundColor }]} />
      <ScrollView style={{ backgroundColor, flex: 1 }}>
        {height > 0 && (
          <View
            style={[
              styles.header,
              { height, backgroundColor: headerBackgroundColor[colorScheme] },
            ]}>
            {headerImage}
          </View>
        )}
        <ThemedView style={[styles.content, contentStyle]}>{children}</ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  statusBarFill: {
    width: '100%',
  },
  header: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    gap: Spacing.lg,
    overflow: 'hidden',
    ...scrollContentGutter,
  },
});
