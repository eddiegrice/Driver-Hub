/**
 * Full-screen background: linear gradient from deep purple to deep blue.
 * Clean, high-contrast look — no frosty overlay.
 */
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GRADIENT_START = '#1A0033';
const GRADIENT_END = '#040A4B';

export function GradientPortalBackground() {
  return (
    <LinearGradient
      colors={[GRADIENT_START, GRADIENT_START, GRADIENT_END]}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
