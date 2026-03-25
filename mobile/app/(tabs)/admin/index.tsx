import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAreaHeader } from '@/components/admin/AdminAreaHeader';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { FontSize, FontWeight, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';

const ADMIN_TILES: { title: string; href: Href }[] = [
  { title: 'News System', href: '/admin/news' as Href },
  { title: 'Casework System', href: '/admin/casework' },
  { title: 'Polls and Surveys System', href: '/admin/polls' },
  { title: 'Membership System', href: '/admin/membership' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets.bottom || 16) + HUB_SCROLL_BOTTOM_GAP },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AdminAreaHeader subsystemLabel="Admin systems" showBackLink={false} />
        {ADMIN_TILES.map((tile) => (
          <Pressable
            key={String(tile.href)}
            onPress={() => router.push(tile.href)}
            style={({ pressed }) => [styles.tilePress, pressed && styles.tilePressed]}
            accessibilityRole="button"
            accessibilityLabel={tile.title}
          >
            <GlassCard
              sleek
              borderRadius={Radius.lg}
              borderColor={LIGHT_EDGE}
              contentStyle={styles.cardContent}
              style={styles.card}
            >
              <View style={styles.titleWrap}>
                <ThemedText style={styles.tileTitle}>{tile.title}</ThemedText>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  tilePress: {
    marginHorizontal: Spacing.md,
  },
  tilePressed: {
    opacity: 0.92,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  titleWrap: {
    width: '100%',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    textAlign: 'center',
  },
});
