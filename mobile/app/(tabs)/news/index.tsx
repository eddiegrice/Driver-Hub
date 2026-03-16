import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { useNews } from '@/context/NewsContext';
import { FontSize, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';

export default function NewsListScreen() {
  const router = useRouter();
  const { posts, isLoading } = useNews();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Trade News" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Trade News" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helperText}>
            Trade and licensing news from the club. Tap a post to read more.
          </ThemedText>

          {posts.length === 0 ? (
            <ThemedText style={styles.empty}>No posts yet.</ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => router.push(`/news/${post.id}`)}
                  activeOpacity={0.8}>
                  <Card accent elevated style={styles.card}>
                    <ThemedText type="defaultSemiBold">{post.title}</ThemedText>
                    <ThemedText style={styles.meta} numberOfLines={1}>
                      {post.authorName} · {formatDateForDisplay(post.publishedAt.slice(0, 10))}
                    </ThemedText>
                    <ThemedText style={styles.excerpt} numberOfLines={2}>
                      {post.body}
                    </ThemedText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </View>
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
    gap: Spacing.xl,
  },
  helperText: {
    opacity: 0.85,
    fontSize: FontSize.body,
  },
  empty: {
    opacity: 0.8,
    paddingVertical: Spacing.xxl,
    fontSize: FontSize.body,
  },
  list: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  meta: {
    fontSize: FontSize.sm,
    opacity: 0.75,
    marginTop: Spacing.xs,
  },
  excerpt: {
    opacity: 0.9,
    marginTop: Spacing.sm,
    fontSize: FontSize.body,
  },
});
