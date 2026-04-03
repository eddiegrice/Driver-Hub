import { Stack } from 'expo-router';

import { appStackScreenOptions } from '@/constants/navigation';

/** Explicit order keeps `index` as the default screen; avoids a stale create/edit screen staying on top. */
export default function AdminLibraryStackLayout() {
  return (
    <Stack screenOptions={{ ...appStackScreenOptions, headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
