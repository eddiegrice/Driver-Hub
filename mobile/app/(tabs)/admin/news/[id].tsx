import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { NewsArticleEditor } from '@/components/admin/NewsArticleEditor';
import { ThemedText } from '@/components/themed-text';
import { useNews } from '@/context/NewsContext';
import { fetchCmsPostById, updateCmsNewsPost, uploadCmsPostImage } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { FontSize, NeoText, Spacing } from '@/constants/theme';

export default function AdminNewsEditScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { refreshPosts } = useNews();

  const [post, setPost] = useState<CmsPost | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setLoadError(new Error('Missing article id.'));
      setLoading(false);
      setPost(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { post: p, error } = await fetchCmsPostById(supabase, id);
    if (error || !p || p.type !== 'news') {
      setPost(null);
      setLoadError(error ?? new Error('Article not found.'));
    } else {
      setPost(p);
      setLoadError(null);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <AdminSubpageScaffold
      subsystemTitle="Edit article"
      backLabel="← News System"
      onBackPress={() => router.dismissTo('/admin/news' as Href)}
      keyboardShouldPersistTaps="handled"
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#00CCFF" />
        </View>
      ) : loadError || !post ? (
        <View style={styles.centered}>
          <ThemedText style={styles.err}>{loadError?.message ?? 'Article not found.'}</ThemedText>
        </View>
      ) : (
        <NewsArticleEditor
          key={post.id}
          submitLabel="Save changes"
          initialTitle={post.title}
          initialBody={post.body}
          initialExcerpt={post.excerpt ?? ''}
          initialAnnounceOnHome={post.isFrontPageAnnouncement}
          initialThumbnailUrl={post.thumbnail_url}
          onSubmit={async (p) => {
            let thumbnailUrl: string | null | undefined = undefined;

            if (p.removeThumbnail) {
              thumbnailUrl = null;
            } else if (p.thumbnailLocalUri) {
              const { publicUrl, error: upErr } = await uploadCmsPostImage(supabase, {
                postId: post.id,
                localUri: p.thumbnailLocalUri,
                mimeType: p.thumbnailMimeType,
              });
              if (upErr) return { error: upErr };
              thumbnailUrl = publicUrl;
            }

            const { error } = await updateCmsNewsPost(supabase, post.id, {
              title: p.title,
              body: p.body,
              excerpt: p.excerpt.trim() ? p.excerpt.trim() : null,
              isFrontPageAnnouncement: p.announceOnHome,
              thumbnailUrl,
            });
            return { error };
          }}
          onSuccess={() => {
            void refreshPosts();
            void load();
          }}
        />
      )}
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  err: {
    color: NeoText.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
