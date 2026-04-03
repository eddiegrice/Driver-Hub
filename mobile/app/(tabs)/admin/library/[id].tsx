import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { NewsArticleEditor } from '@/components/admin/NewsArticleEditor';
import { ThemedText } from '@/components/themed-text';
import { fetchCmsPostById, updateCmsLibraryPost } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';
import type { CmsPost } from '@/types/cms';
import { FontSize, NeoText, Spacing } from '@/constants/theme';

export default function AdminLibraryEditScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();

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
    if (error || !p || p.type !== 'library') {
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
      subsystemTitle="Edit library article"
      backLabel="← Library System"
      onBackPress={() => router.dismissTo('/admin/library' as Href)}
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
          variant="library"
          submitLabel="Save changes"
          initialTitle={post.title}
          initialBody={post.body}
          onSubmit={async (p) => {
            const { error } = await updateCmsLibraryPost(supabase, post.id, {
              title: p.title,
              body: p.body,
            });
            return { error };
          }}
          onSuccess={() => {
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
