import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/ui/GlassCard';
import { fetchFrontPageAnnouncementPosts } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { FontSize, FontWeight, NeoGlass, Radius, Spacing } from '@/constants/theme';

/**
 * Home dashboard: news articles flagged `is_front_page_announcement` (readable by all signed-in users).
 */
export function FrontPageAnnouncementsSection() {
  const router = useRouter();
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { posts: list, error: err } = await fetchFrontPageAnnouncementPosts(supabase);
    setPosts(list);
    setError(err);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && posts.length === 0) {
    return null;
  }

  if (error || posts.length === 0) {
    return null;
  }

  return (
    <GlassCard
      elevated
      borderRadius={Radius.lg}
      borderColor={NeoGlass.cardBorder}
      contentStyle={styles.cardContent}
      sleek
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLine} />
        <ThemedText style={styles.headerText}>Announcements</ThemedText>
        <View style={styles.headerLine} />
      </View>
      <ThemedView style={styles.list}>
        {posts.map((post) => (
          <CmsPostTile key={post.id} post={post} onPress={() => router.push(`/news/${post.id}`)} />
        ))}
      </ThemedView>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
  },
  cardContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: NeoGlass.stroke,
    maxWidth: 72,
  },
  headerText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  list: {
    gap: Spacing.md,
  },
});
