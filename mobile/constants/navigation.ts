import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Stack screens stay **transparent** so `GradientPortalBackground` (root `app/_layout`) shows through.
 *
 * Sliding/fading transitions with transparent cards let two screens’ content show at once → text clash.
 * **`animation: 'none'`** swaps screens instantly so that doesn’t happen, while keeping the gradient look.
 */
export const appStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
  animation: 'none',
};
