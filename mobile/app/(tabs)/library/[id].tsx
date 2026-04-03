import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ArticleDetailContent } from '@/components/ArticleDetailContent';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchCmsPostById } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { Spacing } from '@/constants/theme';

function LibraryDetailInner() {
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
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  if (loading) {
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

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back to library</ThemedText>
          </TouchableOpacity>
          <ArticleDetailContent post={post} showHeroImage={false} />
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function LibraryDetailScreen() {
  return (
    <AssociationMembershipGate title="Guidance Library">
      <LibraryDetailInner />
    </AssociationMembershipGate>
  );
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
