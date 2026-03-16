/**
 * Tabs layout: global header (logo + PHD Matrix left, Home right) and tab content.
 * No bottom tab bar; home screen is the main menu (large icon grid).
 */
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';

export default function TabLayout() {
  return (
    <Tabs>
      <AppHeader />
      <View style={styles.slot}>
        <TabSlot />
      </View>

      {/* Hidden TabList: defines routes for programmatic navigation. */}
      <TabList style={styles.hiddenList}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="campaigns" href="/campaigns" />
        <TabTrigger name="chat" href="/chat" />
        <TabTrigger name="petitions" href="/petitions" />
        <TabTrigger name="polls" href="/polls" />
        <TabTrigger name="casework" href="/casework" />
        <TabTrigger name="earnings-calc" href="/earnings-calc" />
        <TabTrigger name="library" href="/library" />
        <TabTrigger name="news" href="/news" />
        <TabTrigger name="events-gigs" href="/events-gigs" />
        <TabTrigger name="events-sport" href="/events-sport" />
        <TabTrigger name="events-other" href="/events-other" />
        <TabTrigger name="traffic-incidents" href="/traffic-incidents" />
        <TabTrigger name="traffic-current-roadworks" href="/traffic-current-roadworks" />
        <TabTrigger name="traffic-future-roadworks" href="/traffic-future-roadworks" />
        <TabTrigger name="traffic-journey-times" href="/traffic-journey-times" />
        <TabTrigger name="traffic-flows" href="/traffic-flows" />
        <TabTrigger name="traffic-vms-signs" href="/traffic-vms-signs" />
        <TabTrigger name="motorway-status" href="/motorway-status/[code]" />
        <TabTrigger name="profile" href="/profile" />
        <TabTrigger name="docs-vault" href="/docs-vault" />
        <TabTrigger name="member-e-card" href="/member-e-card" />
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  hiddenList: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
  },
});
