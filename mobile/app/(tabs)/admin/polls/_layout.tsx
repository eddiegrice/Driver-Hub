import { Stack } from 'expo-router';

import { appStackScreenOptions } from '@/constants/navigation';

export default function AdminPollsStackLayout() {
  return (
    <Stack screenOptions={{ ...appStackScreenOptions, headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-poll" />
      <Stack.Screen name="create-survey" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
