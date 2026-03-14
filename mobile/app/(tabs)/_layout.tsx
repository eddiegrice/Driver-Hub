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
        <TabTrigger name="profile" href="/profile" />
        <TabTrigger name="casework" href="/casework" />
        <TabTrigger name="news" href="/news" />
        <TabTrigger name="polls" href="/polls" />
        <TabTrigger name="chat" href="/chat" />
        <TabTrigger name="more" href="/more" />
        <TabTrigger name="traffic-alerts" href="/traffic-alerts" />
        <TabTrigger name="local-events" href="/local-events" />
        <TabTrigger name="earnings-calc" href="/earnings-calc" />
        <TabTrigger name="library" href="/library" />
        <TabTrigger name="petitions" href="/petitions" />
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
