import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, NeoText, Spacing } from '@/constants/theme';
import { fetchCmsPosts } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';

function CampaignsListInner() {
  const router = useRouter();
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { posts: list, error: err } = await fetchCmsPosts(supabase, 'campaign');
      if (!cancelled) {
        setPosts(list);
        setError(err);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Campaigns" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Campaigns" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helperText}>
            Club campaigns and updates. Tap a post to read more.
          </ThemedText>

          {error ? (
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          ) : posts.length === 0 ? (
            <ThemedText style={styles.empty}>No campaigns yet.</ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {posts.map((post) => (
                <CmsPostTile
                  key={post.id}
                  post={post}
                  onPress={() => router.push(`/campaigns/${post.id}`)}
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function CampaignsListScreen() {
  return (
    <AssociationMembershipGate title="Campaigns">
      <CampaignsListInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  container: { gap: Spacing.xl },
  helperText: { color: NeoText.secondary, fontSize: FontSize.body },
  errorText: { color: NeoText.error, paddingVertical: Spacing.md },
  empty: { color: NeoText.muted, paddingVertical: Spacing.xxl, fontSize: FontSize.body },
  list: { paddingTop: Spacing.sm },
});
