import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CmsPostTile } from '@/components/CmsPostTile';
import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { FontSize, NeoText, Spacing } from '@/constants/theme';

const HELPER_TEXT =
  'Trade and licensing news from the club. Tap a post to read more.';
const EMPTY_LABEL = 'No news posts yet.';

function NewsListInner() {
  const router = useRouter();
  const { posts, isLoading, error } = useNews();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="News" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="News" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helperText}>{HELPER_TEXT}</ThemedText>

          {error ? (
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
          ) : posts.length === 0 ? (
            <ThemedText style={styles.empty}>{EMPTY_LABEL}</ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {posts.map((post) => (
                <CmsPostTile
                  key={post.id}
                  post={post}
                  onPress={() => router.push(`/news/${post.id}`)}
                />
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function NewsListScreen() {
  return (
    <AssociationMembershipGate title="News">
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
  helperText: {
    color: NeoText.secondary,
    fontSize: FontSize.body,
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
});
