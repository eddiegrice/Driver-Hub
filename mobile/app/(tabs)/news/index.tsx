import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { FontSize, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { cmsPostMatchesSearch } from '@/lib/cms-post-search';

const EMPTY_LABEL = 'No news posts yet.';

function NewsListInner() {
  const router = useRouter();
  const { posts, isLoading, error } = useNews();
  const [search, setSearch] = useState('');

  const visiblePosts = useMemo(
    () => posts.filter((p) => cmsPostMatchesSearch(p, search)),
    [posts, search]
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="News and Updates" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="News and Updates" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          {error ? (
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          ) : (
            <>
              {posts.length > 0 ? (
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search news…"
                  placeholderTextColor={NeoText.muted}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
              ) : null}

              {posts.length === 0 ? (
                <ThemedText style={styles.empty}>{EMPTY_LABEL}</ThemedText>
              ) : visiblePosts.length === 0 ? (
                <ThemedText style={styles.empty}>No articles match your search.</ThemedText>
              ) : (
                <ThemedView style={styles.list}>
                  {visiblePosts.map((post) => (
                    <CmsPostTile key={post.id} post={post} onPress={() => router.push(`/news/${post.id}`)} />
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

export default function NewsListScreen() {
  return (
    <AssociationMembershipGate title="News and Updates">
      <NewsListInner />
    </AssociationMembershipGate>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  container: {
    gap: Spacing.lg,
  },
  errorText: {
    color: NeoText.error,
    paddingVertical: Spacing.md,
  },
  empty: {
    color: NeoText.muted,
    paddingVertical: Spacing.xxl,
    fontSize: FontSize.body,
  },
  list: {
    paddingTop: Spacing.sm,
  },
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
});
