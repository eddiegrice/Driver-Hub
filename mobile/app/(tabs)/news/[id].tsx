import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ArticleDetailContent } from '@/components/ArticleDetailContent';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { fetchCmsPostById } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';

function NewsDetailContent({ post }: { post: CmsPost }) {
  const router = useRouter();
  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back</ThemedText>
        </TouchableOpacity>
        <ArticleDetailContent post={post} />
      </ThemedView>
    </ParallaxScrollView>
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
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <ThemedText>Post not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (post === undefined) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (!post) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <ThemedText>Post not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  const isOpenToAllMembers =
    post.type === 'news' && post.isFrontPageAnnouncement;

  if (isOpenToAllMembers) {
    return <NewsDetailContent post={post} />;
  }

  return (
    <AssociationMembershipGate title="News">
      <NewsDetailContent post={post} />
    </AssociationMembershipGate>
  );
}

export default function NewsDetailScreen() {
  return <NewsDetailCoordinator />;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backRow: { marginBottom: 4 },
});
