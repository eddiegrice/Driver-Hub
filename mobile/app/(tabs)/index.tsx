import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Brand, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const heroBg = useThemeColor(
    { light: Brand.primary, dark: Brand.primaryDark },
    'background'
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Brand.primary, dark: Brand.primaryDark }}
      headerImage={null}>
      <ThemedView style={styles.container}>
        <View style={[styles.hero, { backgroundColor: heroBg }]}>
          <ThemedText style={styles.heroTitle}>Welcome to DriverHub</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Your club app for updates, support and member services.
          </ThemedText>
        </View>

        <Card accent elevated style={styles.sectionCard}>
          <ThemedText type="subtitle" style={styles.sectionLabel}>Latest updates</ThemedText>
          <ThemedText style={styles.sectionBody}>
            Important news and announcements appear here. Tap News to see the full feed.
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/news')} style={styles.linkRow}>
            <ThemedText type="link">View news →</ThemedText>
          </TouchableOpacity>
        </Card>

        <Card accent elevated style={styles.sectionCard}>
          <ThemedText type="subtitle" style={styles.sectionLabel}>Quick links</ThemedText>
          <ThemedText style={styles.sectionBody}>
            Your membership card and profile are in Profile. Need help? Open a casework request.
          </ThemedText>
          <View style={styles.quickLinks}>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <ThemedText type="link">Profile & card</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/casework')}>
              <ThemedText type="link">Casework</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/polls')}>
              <ThemedText type="link">Polls</ThemedText>
            </TouchableOpacity>
          </View>
        </Card>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxl,
  },
  hero: {
    borderRadius: 16,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.92)',
    marginTop: Spacing.sm,
    lineHeight: 24,
  },
  sectionCard: {
    marginTop: 0,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    opacity: 0.9,
    marginBottom: Spacing.md,
  },
  linkRow: {
    marginTop: Spacing.xs,
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
});
