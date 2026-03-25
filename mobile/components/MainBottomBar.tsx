/**
 * Fixed primary navigation: Home, Scout, Association. Car-inspired segmented control.
 */
import * as Haptics from 'expo-haptics';
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { FontSize, FontWeight, NeoGlass, NeoText, Spacing } from '@/constants/theme';

const CYAN = '#00CCFF';

export function getActiveDashboardTab(pathname: string): 'home' | 'scout' | 'association' {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/scout' || p.startsWith('/traffic-') || p.startsWith('/motorway-status')) {
    return 'scout';
  }
  if (
    p === '/association' ||
    p.startsWith('/news') ||
    p.startsWith('/casework') ||
    p.startsWith('/library') ||
    p.startsWith('/polls') ||
    p.startsWith('/chat') ||
    p.startsWith('/member-e-card')
  ) {
    return 'association';
  }
  return 'home';
}

export function MainBottomBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const active = getActiveDashboardTab(pathname);

  const go = (tab: 'home' | 'scout' | 'association') => {
    if (tab === active) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab === 'home') router.replace('/');
    else if (tab === 'scout') router.replace('/scout');
    else router.replace('/association');
  };

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: Math.max(insets.bottom, Spacing.sm),
          borderTopColor: NeoGlass.strokeBright,
        },
      ]}
    >
      <View style={styles.topHighlight} />
      <View style={styles.row}>
        <Segment
          label="Home"
          icon="house.fill"
          active={active === 'home'}
          onPress={() => go('home')}
        />
        <View style={styles.divider} />
        <Segment
          label="Scout"
          icon="map.fill"
          active={active === 'scout'}
          onPress={() => go('scout')}
        />
        <View style={styles.divider} />
        <Segment
          label="Association"
          icon="person.3.fill"
          active={active === 'association'}
          onPress={() => go('association')}
        />
      </View>
    </View>
  );
}

function Segment({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconSymbolName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        active && styles.segmentActive,
        pressed && styles.segmentPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <IconSymbol name={icon} size={26} color={active ? CYAN : NeoText.muted} />
      <ThemedText style={[styles.segmentLabel, active && styles.segmentLabelActive]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(12, 14, 20, 0.96)',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: '12%',
    right: '12%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(22, 24, 32, 0.95)',
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: NeoGlass.stroke,
    marginVertical: 10,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 64,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: 'rgba(0, 204, 255, 0.12)',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  segmentPressed: {
    opacity: 0.92,
  },
  segmentLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: NeoText.muted,
    letterSpacing: 0.5,
  },
  segmentLabelActive: {
    color: CYAN,
  },
});
