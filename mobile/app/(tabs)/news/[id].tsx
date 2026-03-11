import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNews } from '@/context/NewsContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatDateForDisplay } from '@/types/member';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

function BodyWithLinks({ body }: { body: string }) {
  const linkColor = useThemeColor({}, 'tint');
  const parts = body.split(URL_REGEX);
  return (
    <ThemedText style={styles.bodyText}>
      {parts.map((part, i) =>
        IS_URL.test(part) ? (
          <ThemedText
            key={i}
            style={[styles.link, { color: linkColor }]}
            onPress={() => Linking.openURL(part)}>
            {part}
          </ThemedText>
        ) : (
          <ThemedText key={i}>{part}</ThemedText>
        )
      )}
    </ThemedText>
  );
}

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPost } = useNews();
  const post = id ? getPost(id) : undefined;

  if (!id || !post) {
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

        <ThemedText type="title">{post.title}</ThemedText>
        <ThemedText style={styles.meta}>
          {post.authorName} · {formatDateForDisplay(post.publishedAt.slice(0, 10))}
        </ThemedText>

        <View style={styles.body}>
          <BodyWithLinks body={post.body} />
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  backRow: {
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  body: {
    marginTop: 12,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
