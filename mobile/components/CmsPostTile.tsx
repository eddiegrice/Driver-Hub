/**
 * Shared article tile for News, Campaigns, Library list screens.
 * Glass style to match home menu; shows title, date, snippet, optional thumbnail.
 */
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontSize, NeoText, Radius, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';
import type { CmsPost } from '@/types/cms';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const SNIP_LENGTH = 120;

function snippet(text: string, maxLen: number): string {
  const t = (text ?? '').trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + '…';
}

type CmsPostTileProps = {
  post: CmsPost;
  onPress: () => void;
};

export function CmsPostTile({ post, onPress }: CmsPostTileProps) {
  const dateStr = formatDateForDisplay(post.published_at.slice(0, 10));
  const timeStr = post.published_at.length >= 16 ? post.published_at.slice(11, 16) : null;
  const meta = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  const author = post.author_name ? ` · ${post.author_name}` : '';
  const excerptText = post.excerpt ?? snippet(post.body, SNIP_LENGTH);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard
        elevated
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.content}
        sleek
        style={styles.card}
      >
        <View style={styles.inner}>
          {post.thumbnail_url ? (
            <Image
              source={{ uri: post.thumbnail_url }}
              style={styles.thumb}
              contentFit="cover"
            />
          ) : null}
          <View style={styles.textBlock}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {post.title}
            </ThemedText>
            <ThemedText style={styles.meta} numberOfLines={1}>
              {meta}{author}
            </ThemedText>
            <ThemedText style={styles.excerpt} numberOfLines={2}>
              {excerptText}
            </ThemedText>
          </View>
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
    width: 72,
    height: 72,
    borderRadius: Radius.lg - 4,
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
    marginBottom: 2,
  },
  meta: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    marginBottom: 4,
  },
  excerpt: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
    lineHeight: 20,
  },
});
