import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { NewsArticleEditor } from '@/components/admin/NewsArticleEditor';
import { useMember } from '@/context/MemberContext';
import { useNews } from '@/context/NewsContext';
import { insertCmsNewsPost } from '@/lib/cms-supabase';
import { supabase } from '@/lib/supabase';

export default function AdminNewsCreateScreen() {
  const router = useRouter();
  const { member } = useMember();
  const { refreshPosts } = useNews();

  return (
    <AdminSubpageScaffold
      subsystemTitle="Create News Article"
      backLabel="← News System"
      onBackPress={() => router.push('/admin/news' as Href)}
      keyboardShouldPersistTaps="handled"
    >
      <NewsArticleEditor
        submitLabel="Publish news"
        hint="Articles appear in Association → News for active members. Use the switch below to also show this on the home dashboard for every signed-in member."
        onSubmit={async (p) => {
          const { error } = await insertCmsNewsPost(supabase, {
            title: p.title,
            body: p.body,
            excerpt: p.excerpt.trim() ? p.excerpt.trim() : null,
            authorName: member?.name?.trim() || null,
            isFrontPageAnnouncement: p.announceOnHome,
          });
          return { error };
        }}
        onSuccess={() => {
          void refreshPosts();
          router.push('/admin/news' as Href);
        }}
      />
    </AdminSubpageScaffold>
  );
}
