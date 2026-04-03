import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ArticleDetailContent } from '@/components/ArticleDetailContent';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { fetchCmsPostById } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { Spacing } from '@/constants/theme';

function NewsDetailContent({ post }: { post: CmsPost }) {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back</ThemedText>
          </TouchableOpacity>
          <ArticleDetailContent post={post} />
        </ThemedView>
      </ScrollView>
    </View>
  );
}

/**
 * Loads post first (RLS); front-page announcements skip premium gate so all signed-in users can read.
 */
function NewsDetailCoordinator() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPost } = useNews();
  const [post, setPost] = useState<CmsPost | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setPost(null);
      return;
    }
    const cached = getPost(id);
    if (cached) {
      setPost(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      const { post: p } = await fetchCmsPostById(supabase, id);
      if (!cancelled) {
        setPost(p ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getPost]);

  if (!id) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText>Post not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (post === undefined) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText>Loading…</ThemedText>
        </ScrollView>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText>Post not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const isOpenToAllMembers = post.type === 'news' && post.isFrontPageAnnouncement;

  if (isOpenToAllMembers) {
    return <NewsDetailContent post={post} />;
  }

  return (
    <AssociationMembershipGate title="News and Updates">
      <NewsDetailContent post={post} />
    </AssociationMembershipGate>
  );
}

export default function NewsDetailScreen() {
  return <NewsDetailCoordinator />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  inner: { gap: 12 },
  backRow: { alignSelf: 'flex-start' },
});
