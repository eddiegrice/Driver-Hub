import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlasgowRoadsAlertsCard } from '@/components/home/GlasgowRoadsAlertsCard';
import { MenuIconGrid, type MenuGridItem } from '@/components/home/MenuIconGrid';
import { UpcomingEventsCard } from '@/components/home/UpcomingEventsCard';
import { useTraffic } from '@/context/TrafficContext';
import { useBridgeBanner } from '@/hooks/useBridgeBanner';
import { useGlasgowEventsBanner } from '@/hooks/useGlasgowEventsBanner';
import { computeMotorwayStatuses } from '@/lib/traffic-status';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { Spacing } from '@/constants/theme';

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
  const { situations } = useTraffic();
  const { bridgeBanner } = useBridgeBanner();
  const { eventsRows, eventsLoading, eventsError } = useGlasgowEventsBanner();

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
        <GlasgowRoadsAlertsCard bridgeBanner={bridgeBanner} motorwayStatuses={motorwayStatuses} />
        <UpcomingEventsCard
          eventsRows={eventsRows}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
        />
        <MenuIconGrid
          title="Glasgow Traffic Data"
          items={TRAFFIC_MENU}
          itemsPerRow={3}
          isMemberActive
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
});
