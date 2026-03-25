/**
 * Stack layout: global header (logo + PHD Matrix), screen stack, fixed bottom hub bar.
 */
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { MainBottomBar } from '@/components/MainBottomBar';
import { appStackScreenOptions } from '@/constants/navigation';

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.stackWrap}>
        <Stack screenOptions={appStackScreenOptions} />
      </View>
      <MainBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackWrap: {
    flex: 1,
  },
});
