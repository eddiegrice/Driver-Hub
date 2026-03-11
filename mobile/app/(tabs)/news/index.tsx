import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
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
      <ParallaxScrollView headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }} headerImage={null}>
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">News &amp; Updates</ThemedText>
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
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
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
