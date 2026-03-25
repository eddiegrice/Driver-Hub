import { Stack } from 'expo-router';

import { appStackScreenOptions } from '@/constants/navigation';

export default function CaseworkLayout() {
  return (
    <Stack screenOptions={appStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
