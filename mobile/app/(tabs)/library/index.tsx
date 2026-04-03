import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import {
  CMS_POST_TITLE_SORT_PILLS,
  cmsPostMatchesSearch,
  sortCmsPostsByTitle,
  type CmsPostTitleSort,
} from '@/lib/cms-post-search';
import { fetchCmsPosts } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';

const CYAN = '#00CCFF';

function LibraryListInner() {
  const router = useRouter();
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CmsPostTitleSort>('title_az');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { posts: list, error: err } = await fetchCmsPosts(supabase, 'library');
      if (!cancelled) {
        setPosts(list);
        setError(err);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const visiblePosts = useMemo(() => {
    const filtered = posts.filter((p) => cmsPostMatchesSearch(p, search));
    return sortCmsPostsByTitle(filtered, sort);
  }, [posts, search, sort]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="Guidance Library" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Guidance Library" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          {error ? (
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          ) : (
            <>
              {posts.length > 0 ? (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search library…"
                    placeholderTextColor={NeoText.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pillScroll}
                    contentContainerStyle={styles.pillRow}>
                    {CMS_POST_TITLE_SORT_PILLS.map(({ key, label }) => {
                      const active = sort === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setSort(key)}
                          style={({ pressed }) => [
                            styles.pill,
                            active && styles.pillActive,
                            pressed && styles.pillPressed,
                          ]}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: active }}>
                          <ThemedText style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {posts.length === 0 ? (
                <ThemedText style={styles.empty}>No library posts yet.</ThemedText>
              ) : visiblePosts.length === 0 ? (
                <ThemedText style={styles.empty}>No articles match your search.</ThemedText>
              ) : (
                <ThemedView style={styles.list}>
                  {visiblePosts.map((post) => (
                    <CmsPostTile
                      key={post.id}
                      post={post}
                      listStyle="titleOnly"
                      onPress={() => router.push(`/library/${post.id}`)}
                    />
                  ))}
                </ThemedView>
              )}
            </>
          )}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function LibraryListScreen() {
  return (
    <AssociationMembershipGate title="Guidance Library">
      <LibraryListInner />
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
  container: { gap: Spacing.lg },
  errorText: { color: NeoText.error, paddingVertical: Spacing.md },
  empty: { color: NeoText.muted, paddingVertical: Spacing.xxl, fontSize: FontSize.body },
  list: { paddingTop: Spacing.sm },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: NeoText.primary,
  },
  pillScroll: {
    flexGrow: 0,
    marginHorizontal: -Spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    backgroundColor: 'rgba(22, 24, 32, 0.75)',
  },
  pillActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0, 204, 255, 0.14)',
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.muted,
  },
  pillLabelActive: {
    color: CYAN,
  },
});
