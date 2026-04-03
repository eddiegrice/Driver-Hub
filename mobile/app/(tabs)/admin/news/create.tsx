import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { NewsArticleEditor } from '@/components/admin/NewsArticleEditor';
import { useMember } from '@/context/MemberContext';
import { useNews } from '@/context/NewsContext';
import { insertCmsNewsPost, updateCmsNewsPost, uploadCmsPostImage } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';

export default function AdminNewsCreateScreen() {
  const router = useRouter();
  const { member } = useMember();
  const { refreshPosts } = useNews();

  return (
    <AdminSubpageScaffold
      subsystemTitle="Create News Article"
      backLabel="← News System"
      onBackPress={() => router.dismissTo('/admin/news' as Href)}
      keyboardShouldPersistTaps="handled"
    >
      <NewsArticleEditor
        submitLabel="Publish news"
        onSubmit={async (p) => {
          const { id, error } = await insertCmsNewsPost(supabase, {
            title: p.title,
            body: p.body,
            excerpt: p.excerpt.trim() ? p.excerpt.trim() : null,
            authorName: member?.name?.trim() || null,
            isFrontPageAnnouncement: p.announceOnHome,
          });
          if (error || !id) return { error: error ?? new Error('Failed to create article.') };

          if (p.thumbnailLocalUri) {
            const { publicUrl, error: upErr } = await uploadCmsPostImage(supabase, {
              postId: id,
              localUri: p.thumbnailLocalUri,
              mimeType: p.thumbnailMimeType,
            });
            if (upErr) return { error: upErr };
            const { error: saveErr } = await updateCmsNewsPost(supabase, id, {
              title: p.title,
              body: p.body,
              excerpt: p.excerpt.trim() ? p.excerpt.trim() : null,
              isFrontPageAnnouncement: p.announceOnHome,
              thumbnailUrl: publicUrl,
            });
            return { error: saveErr };
          }

          return { error: null };
        }}
        onSuccess={() => {
          void refreshPosts();
          router.dismissTo('/admin/news' as Href);
        }}
      />
    </AdminSubpageScaffold>
  );
}
