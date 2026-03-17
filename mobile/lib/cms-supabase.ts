import type { SupabaseClient } from '@supabase/supabase-js';
import type { CmsPost, CmsPostType } from '@/types/cms';

type Row = {
  id: string;
  type: string;
  title: string;
  body: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

function rowToPost(row: Row): CmsPost {
  return {
    id: row.id,
    type: row.type as CmsPostType,
    title: row.title,
    body: row.body,
    excerpt: row.excerpt,
    thumbnail_url: row.thumbnail_url,
    author_name: row.author_name,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetch CMS posts for a given type (news, campaign, library), newest first.
 */
export async function fetchCmsPosts(
  supabase: SupabaseClient | null,
  type: CmsPostType
): Promise<{ posts: CmsPost[]; error: Error | null }> {
  if (!supabase) {
    return { posts: [], error: null };
  }
  const { data, error } = await supabase
    .from('cms_posts')
    .select('id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at')
    .eq('type', type)
    .order('published_at', { ascending: false });
  if (error) {
    return { posts: [], error };
  }
  const posts = (data ?? []).map((row) => rowToPost(row as Row));
  return { posts, error: null };
}

/**
 * Fetch a single CMS post by id (for detail screen).
 */
export async function fetchCmsPostById(
  supabase: SupabaseClient | null,
  id: string
): Promise<{ post: CmsPost | null; error: Error | null }> {
  if (!supabase) {
    return { post: null, error: null };
  }
  const { data, error } = await supabase
    .from('cms_posts')
    .select('id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) {
    return { post: null, error: error ?? null };
  }
  return { post: rowToPost(data as Row), error: null };
}
