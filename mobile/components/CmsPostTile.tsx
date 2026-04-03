/**
 * Shared article tile for News and Library list screens.
 * Glass style to match home menu. Default: title + excerpt or body snippet + optional thumbnail.
 * `listStyle="titleOnly"` (Guidance Library): title only.
 */
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontSize, NeoText, Radius, Spacing } from '@/constants/theme';
import { isLikelyHtmlContent, stripHtmlToPlainText } from '@/lib/cms-body-html';
import type { CmsPost } from '@/types/cms';

// Match the vibrant "data box" look used in Traffic / Events tiles.
const CMS_TILE_BORDER = 'rgba(140, 180, 255, 0.7)';
const CMS_TILE_BG = 'rgba(40, 80, 200, 0.18)';
const SNIP_LENGTH = 120;

function snippet(text: string, maxLen: number): string {
  const t = (text ?? '').trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + '…';
}

type CmsPostTileProps = {
  post: CmsPost;
  onPress: () => void;
  /** Guidance Library: title only (no excerpt, body snippet, or thumbnail). */
  listStyle?: 'default' | 'titleOnly';
};

export function CmsPostTile({ post, onPress, listStyle = 'default' }: CmsPostTileProps) {
  const titleOnly = listStyle === 'titleOnly';

  const excerptTrimmed = post.excerpt?.trim() ?? '';
  const fromExcerpt = excerptTrimmed.length > 0;
  const rawBody = post.body ?? '';
  const bodyForSnippet = isLikelyHtmlContent(rawBody) ? stripHtmlToPlainText(rawBody) : rawBody;
  const tileSubtitle = fromExcerpt ? excerptTrimmed : snippet(bodyForSnippet, SNIP_LENGTH);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard
        elevated
        borderRadius={Radius.lg}
        borderColor={CMS_TILE_BORDER}
        contentStyle={[styles.content, { backgroundColor: CMS_TILE_BG }]}
        sleek
        style={styles.card}
      >
        <View style={styles.inner}>
          <View style={styles.textBlock}>
            <ThemedText
              style={[styles.title, titleOnly && styles.titleOnly]}
              numberOfLines={titleOnly ? 3 : 2}>
              {post.title}
            </ThemedText>
            {!titleOnly ? (
              <ThemedText style={styles.excerpt} numberOfLines={fromExcerpt ? undefined : 2}>
                {tileSubtitle}
              </ThemedText>
            ) : null}
          </View>
          {!titleOnly && post.thumbnail_url ? (
            <Image
              source={{ uri: post.thumbnail_url }}
              style={styles.thumb}
              contentFit="cover"
            />
          ) : null}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  content: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  inner: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg - 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: NeoText.primary,
    marginBottom: 6,
  },
  titleOnly: {
    marginBottom: 0,
  },
  excerpt: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
    lineHeight: 20,
  },
});
