import { Stack } from 'expo-router';

export default function CurrentRoadworksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
