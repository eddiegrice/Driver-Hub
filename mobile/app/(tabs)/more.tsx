import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MoreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }}
      headerImage={null}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">More</ThemedText>
        <ThemedText style={styles.placeholder}>
          Placeholder for future features. New functionality will appear here in later versions.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
  },
  placeholder: {
    opacity: 0.85,
    fontSize: 17,
  },
});
