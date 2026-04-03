/**
 * Shared full-article content: title, date, body (plain + URL links or sanitized HTML).
 * Used by News and Library detail screens.
 */
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isLikelyHtmlContent, sanitizeCmsBodyHtml } from '@/lib/cms-body-html';
import { formatDateForDisplay } from '@/types/member';
import type { CmsPost } from '@/types/cms';
import { Radius } from '@/constants/theme';

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
  /** Guidance Library omits the hero image even if legacy DB rows have a thumbnail. */
  showHeroImage?: boolean;
};

export function ArticleDetailContent({ post, showHeroImage = true }: ArticleDetailContentProps) {
  const dateLine = formatDateForDisplay(post.published_at.slice(0, 10));
  const { width } = useWindowDimensions();
  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const body = post.body ?? '';
  const html = sanitizeCmsBodyHtml(body);
  const useHtml = isLikelyHtmlContent(html);

  const contentWidth = Math.max(0, width - 48);

  return (
    <>
      {showHeroImage && post.thumbnail_url ? (
        <Image
          source={{ uri: post.thumbnail_url }}
          style={styles.hero}
          contentFit="cover"
        />
      ) : null}
      <ThemedText type="title">{post.title}</ThemedText>
      <ThemedText style={styles.meta}>{dateLine}</ThemedText>
      <View style={styles.body}>
        {useHtml ? (
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html }}
            systemFonts={[...defaultSystemFonts]}
            baseStyle={{
              color: textColor,
              fontSize: 16,
              lineHeight: 24,
            }}
            tagsStyles={{
              body: { margin: 0 },
              p: { marginTop: 0, marginBottom: 10 },
              div: { marginBottom: 8 },
              ul: { marginBottom: 8 },
              ol: { marginBottom: 8 },
              li: { marginBottom: 4 },
              a: { color: tint, textDecorationLine: 'underline' as const },
              span: { color: textColor },
            }}
            renderersProps={{
              a: {
                onPress: (_event: unknown, href: string) => {
                  if (href) void Linking.openURL(href);
                },
              },
            }}
          />
        ) : (
          <BodyWithLinks body={body} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
