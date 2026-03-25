import { Stack } from 'expo-router';

import { appStackScreenOptions } from '@/constants/navigation';

export default function FutureRoadworksLayout() {
  return (
    <Stack screenOptions={appStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
