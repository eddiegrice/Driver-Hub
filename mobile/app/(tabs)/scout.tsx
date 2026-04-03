import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlasgowRoadsAlertsCard } from '@/components/home/GlasgowRoadsAlertsCard';
import { MenuIconGrid, type MenuGridItem } from '@/components/home/MenuIconGrid';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemedText } from '@/components/themed-text';
import { useMember } from '@/context/MemberContext';
import { useTraffic } from '@/context/TrafficContext';
import { useBridgeBanner } from '@/hooks/useBridgeBanner';
import { useThemeColor } from '@/hooks/use-theme-color';
import { computeMotorwayStatuses } from '@/lib/traffic-status';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { FontSize, NeoGlass, Radius, Spacing } from '@/constants/theme';

const TRAFFIC_MENU: MenuGridItem[] = [
  { route: '/traffic-incidents', label: 'Incidents', icon: 'exclamationmark.triangle.fill' },
  { route: '/traffic-current-roadworks', label: 'Current Roadworks', icon: 'wrench.and.screwdriver' },
  { route: '/traffic-future-roadworks', label: 'Future Roadworks', icon: 'calendar.badge.clock' },
  { route: '/traffic-journey-times', label: 'Journey Times', icon: 'clock.fill' },
  { route: '/traffic-flows', label: 'Traffic Flows', icon: 'chart.line.uptrend.xyaxis' },
  { route: '/traffic-vms-signs', label: 'VMS Signs', icon: 'signpost.left.fill' },
];

export default function ScoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memberStatus } = useMember();
  const { situations } = useTraffic();
  const { bridgeBanner } = useBridgeBanner();
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  const motorwayStatuses = useMemo(
    () => computeMotorwayStatuses(situations),
    [situations]
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.md, paddingBottom: (insets.bottom || 16) + HUB_SCROLL_BOTTOM_GAP },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TabScreenHeader title="Glasgow Traffic Scout" />
        <GlassCard
          elevated
          borderRadius={Radius.lg}
          borderColor={NeoGlass.cardBorder}
          contentStyle={styles.plannerCardContent}
          sleek
          style={styles.plannerCard}>
          <View style={styles.plannerHeaderRow}>
            <View style={styles.plannerHeaderLine} />
            <ThemedText style={styles.plannerHeaderText}>Plan & Scout</ThemedText>
            <View style={styles.plannerHeaderLine} />
          </View>
          <ThemedText style={styles.plannerDescription}>Check for issues along your route.</ThemedText>
          <View style={styles.plannerInputs}>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
              placeholder="Start point"
              placeholderTextColor={mutedColor}
              editable={false}
            />
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
              placeholder="End point"
              placeholderTextColor={mutedColor}
              editable={false}
            />
            <TouchableOpacity style={[styles.goButton, { backgroundColor: tintColor }]}>
              <ThemedText style={styles.goButtonText}>GO</ThemedText>
            </TouchableOpacity>
          </View>
        </GlassCard>
        <GlasgowRoadsAlertsCard bridgeBanner={bridgeBanner} motorwayStatuses={motorwayStatuses} />
        <MenuIconGrid
          title="Glasgow Traffic Data"
          items={TRAFFIC_MENU}
          itemsPerRow={3}
          isMemberActive={memberStatus.isActive}
          onNavigate={(route) => router.push(route)}
          onPremiumBlocked={() => {}}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xxl,
  },
  plannerCard: {
    marginHorizontal: Spacing.md,
    marginTop: 0,
  },
  plannerCardContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  plannerHeaderRow: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  plannerHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: NeoGlass.stroke,
    maxWidth: 72,
  },
  plannerHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  plannerDescription: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  plannerInputs: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    opacity: 0.85,
  },
  goButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  goButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.6,
  },
});
