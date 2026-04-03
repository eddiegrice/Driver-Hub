import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { UpcomingEventsCard } from '@/components/home/UpcomingEventsCard';
import { useGlasgowEventsBanner } from '@/hooks/useGlasgowEventsBanner';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { Spacing } from '@/constants/theme';

export default function EventsScoutScreen() {
  const insets = useSafeAreaInsets();
  const { eventsRows, eventsLoading, eventsError } = useGlasgowEventsBanner();

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
        <TabScreenHeader title="Glasgow Events Scout" />
        <UpcomingEventsCard
          eventsRows={eventsRows}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
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
