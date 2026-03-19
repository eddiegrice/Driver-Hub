import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ArticleDetailContent } from '@/components/ArticleDetailContent';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchCmsPostById } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';

function CampaignDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<CmsPost | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { post: p } = await fetchCmsPostById(supabase, id);
      if (!cancelled) {
        setPost(p ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

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

  if (loading) {
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
          <ThemedText type="link">← Back to campaigns</ThemedText>
        </TouchableOpacity>
        <ArticleDetailContent post={post} />
      </ThemedView>
    </ParallaxScrollView>
  );
}

export default function CampaignDetailScreen() {
  return (
    <AssociationMembershipGate title="Campaigns">
      <CampaignDetailInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backRow: { marginBottom: 4 },
});
