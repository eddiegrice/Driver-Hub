/**
 * Shared full-article content: title, meta, body with clickable URLs.
 * Used by News and Library detail screens.
 */
import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatDateForDisplay } from '@/types/member';
import type { CmsPost } from '@/types/cms';

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

type ArticleDetailContentProps = {
  post: CmsPost;
};

export function ArticleDetailContent({ post }: ArticleDetailContentProps) {
  const meta = post.author_name
    ? `${post.author_name} · ${formatDateForDisplay(post.published_at.slice(0, 10))}`
    : formatDateForDisplay(post.published_at.slice(0, 10));

  return (
    <>
      <ThemedText type="title">{post.title}</ThemedText>
      <ThemedText style={styles.meta}>{meta}</ThemedText>
      <View style={styles.body}>
        <BodyWithLinks body={post.body} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
