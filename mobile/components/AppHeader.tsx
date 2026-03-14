/**
 * Global app header: logo + PHD Matrix (left), Home button (right).
 * Shown at the top of every page.
 */
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  FontSize,
  FontWeight,
  NeoText,
  Spacing,
} from '@/constants/theme';

const HERO_LOGO_CYAN = '#00ccff';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isHome =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname === '(tabs)' ||
    pathname === '(tabs)/';

  const goHome = () => {
    if (isHome) return;
    router.push('/');
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.md }]}>
      <Pressable
        style={({ pressed }) => [styles.left, pressed && styles.leftPressed]}
        onPress={goHome}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <View style={styles.logoPlaceholder} />
        <View style={styles.titleWrap}>
          <ThemedText style={styles.titlePHD}>PHD</ThemedText>
          <ThemedText style={styles.titleMatrix}>MATRIX</ThemedText>
        </View>
      </Pressable>
      <Pressable
        onPress={goHome}
        style={({ pressed }) => [styles.homeBtn, pressed && styles.homeBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Go to home"
      >
        <IconSymbol name="house.fill" size={24} color={NeoText.primary} />
        <ThemedText style={styles.homeLabel}>Home</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  leftPressed: {
    opacity: 0.85,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: HERO_LOGO_CYAN,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  titlePHD: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.superheavy,
    color: NeoText.primary,
    letterSpacing: -0.5,
  },
  titleMatrix: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.light,
    color: NeoText.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  homeBtnPressed: {
    opacity: 0.8,
  },
  homeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
});
