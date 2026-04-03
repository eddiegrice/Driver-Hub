import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { NewsArticleEditor } from '@/components/admin/NewsArticleEditor';
import { useMember } from '@/context/MemberContext';
import { insertCmsLibraryPost } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';

export default function AdminLibraryCreateScreen() {
  const router = useRouter();
  const { member } = useMember();

  return (
    <AdminSubpageScaffold
      subsystemTitle="Create Library Article"
      backLabel="← Library System"
      onBackPress={() => router.dismissTo('/admin/library' as Href)}
      keyboardShouldPersistTaps="handled"
    >
      <NewsArticleEditor
        variant="library"
        submitLabel="Publish to library"
        onSubmit={async (p) => {
          const { id, error } = await insertCmsLibraryPost(supabase, {
            title: p.title,
            body: p.body,
            authorName: member?.name?.trim() || null,
          });
          if (error || !id) return { error: error ?? new Error('Failed to create article.') };
          return { error: null };
        }}
        onSuccess={() => {
          router.dismissTo('/admin/library' as Href);
        }}
      />
    </AdminSubpageScaffold>
  );
}
