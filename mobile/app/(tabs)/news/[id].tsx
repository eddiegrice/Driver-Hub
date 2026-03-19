import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ArticleDetailContent } from '@/components/ArticleDetailContent';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { fetchCmsPostById } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';

function NewsDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPost } = useNews();
  const fromList = id ? getPost(id) : undefined;
  const [fetchedPost, setFetchedPost] = useState<CmsPost | null>(null);
  const [loadingId, setLoadingId] = useState(false);

  useEffect(() => {
    if (!id || fromList) return;
    let cancelled = false;
    (async () => {
      setLoadingId(true);
      const { post } = await fetchCmsPostById(supabase, id);
      if (!cancelled) {
        setFetchedPost(post ?? null);
        setLoadingId(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, fromList]);

  const post = fromList ?? fetchedPost ?? undefined;

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

  if (loadingId) {
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

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back to news</ThemedText>
        </TouchableOpacity>
        <ArticleDetailContent post={post} />
      </ThemedView>
    </ParallaxScrollView>
  );
}

export default function NewsDetailScreen() {
  return (
    <AssociationMembershipGate title="News">
      <NewsDetailInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backRow: { marginBottom: 4 },
});
