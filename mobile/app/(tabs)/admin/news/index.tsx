import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { MenuSectionEyebrow } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useNews } from '@/context/NewsContext';
import { fetchCmsPosts } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';

const CYAN = '#00CCFF';
const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';

export default function AdminNewsLandingScreen() {
  const router = useRouter();
  const { refreshPosts } = useNews();

  const [newsPosts, setNewsPosts] = useState<CmsPost[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = useCallback(async () => {
    setListError(null);
    const { posts, error } = await fetchCmsPosts(supabase, 'news');
    setNewsPosts(posts);
    setListError(error);
    setListLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setListLoading(true);
      void loadNews();
    }, [loadNews])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadNews();
    void refreshPosts();
  }, [loadNews, refreshPosts]);

  return (
    <AdminSubpageScaffold
      subsystemTitle="News System"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}
    >
      <View style={styles.body}>
        <View style={styles.createTileOuter}>
          <Pressable
            onPress={() => router.push('/admin/news/create' as Href)}
            style={({ pressed }) => [
              styles.createTileSurface,
              pressed && styles.createTileSurfacePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create News Article"
          >
            <ThemedText style={styles.createTileText} numberOfLines={2}>
              Create News Article
            </ThemedText>
          </Pressable>
        </View>

        <GlassCard
          sleek
          borderRadius={Radius.lg}
          borderColor={LIGHT_EDGE}
          contentStyle={styles.panelInner}
          style={styles.panelCard}
        >
          <View style={styles.panelHeaderWrap}>
            <MenuSectionEyebrow label="Articles" />
          </View>

          {listLoading ? (
            <ActivityIndicator color={CYAN} style={styles.listSpinner} />
          ) : listError ? (
            <ThemedText style={styles.msgErr}>{listError.message}</ThemedText>
          ) : newsPosts.length === 0 ? (
            <ThemedText style={styles.emptyList}>No news articles yet.</ThemedText>
          ) : (
            <View style={styles.listBlock}>
              {newsPosts.map((post, i) => (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(`/admin/news/${post.id}` as Href)}
                  style={({ pressed }) => [
                    styles.row,
                    i === newsPosts.length - 1 && styles.rowLast,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit article: ${post.title}`}
                >
                  <ThemedText style={styles.rowTitle} numberOfLines={2}>
                    {post.title}
                  </ThemedText>
                  <ThemedText style={styles.rowMeta}>
                    {formatDateForDisplay(post.published_at.slice(0, 10))}
                    {post.isFrontPageAnnouncement ? ' · Home' : ''}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </GlassCard>
      </View>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  createTileOuter: {
    marginHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  createTileSurface: {
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    backgroundColor: CYAN,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  createTileSurfacePressed: {
    backgroundColor: '#00B8E6',
  },
  createTileText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: '#000000',
    textAlign: 'center',
    flexShrink: 1,
    width: '100%',
  },
  panelCard: {
    marginHorizontal: Spacing.md,
    width: 'auto',
    alignSelf: 'stretch',
  },
  panelInner: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  panelHeaderWrap: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listSpinner: {
    marginVertical: Spacing.md,
  },
  msgErr: {
    color: NeoText.error,
    fontSize: FontSize.sm,
  },
  emptyList: {
    color: NeoText.muted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.sm,
  },
  listBlock: {
    gap: 0,
  },
  row: {
    gap: 4,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: NeoGlass.stroke,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
});
