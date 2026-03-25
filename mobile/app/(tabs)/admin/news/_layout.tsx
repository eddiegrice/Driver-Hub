import { Stack } from 'expo-router';

import { appStackScreenOptions } from '@/constants/navigation';

export default function AdminNewsStackLayout() {
  return <Stack screenOptions={{ ...appStackScreenOptions, headerShown: false }} />;
}
