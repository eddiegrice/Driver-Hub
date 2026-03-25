import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchFrontPageAnnouncementPosts } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { FontSize, FontWeight, NeoGlass, NeoText, Spacing } from '@/constants/theme';

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
    <ThemedView style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLine} />
        <ThemedText style={styles.headerText}>Announcements</ThemedText>
        <View style={styles.headerLine} />
      </View>
      <ThemedText style={styles.subtitle}>Important updates for every member</ThemedText>
      <View style={styles.list}>
        {posts.map((post) => (
          <CmsPostTile key={post.id} post={post} onPress={() => router.push(`/news/${post.id}`)} />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
});
