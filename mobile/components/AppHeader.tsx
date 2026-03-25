/**
 * Global app header: logo + PHD Matrix (left); Admin link (right) for admins only.
 */
import type { Href } from 'expo-router';
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useMember } from '@/context/MemberContext';
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
  const { memberStatus, isLoading: memberLoading } = useMember();
  const isHome =
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname === '(tabs)' ||
    pathname === '(tabs)/';

  const goHome = () => {
    if (isHome) return;
    router.replace('/');
  };

  const showAdminLink = !memberLoading && memberStatus.isAdmin;

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
      <View style={styles.rightSlot}>
        {showAdminLink ? (
          <Pressable
            onPress={() => router.push('/admin' as Href)}
            style={({ pressed }) => [styles.adminPill, pressed && styles.adminPillPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open admin panel"
          >
            <ThemedText style={styles.adminPillLabel}>Admin Panel</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  rightSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  adminPill: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    backgroundColor: HERO_LOGO_CYAN,
    minHeight: 40,
    justifyContent: 'center',
  },
  adminPillPressed: {
    opacity: 0.88,
  },
  adminPillLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#000000',
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
});
