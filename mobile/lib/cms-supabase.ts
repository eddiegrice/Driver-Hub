import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeCmsPostType, type CmsPost, type CmsPostType } from '@/types/cms';

const CMS_SELECT_COLUMNS =
  'id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at, is_front_page_announcement';

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
  is_front_page_announcement?: boolean | null;
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
    isFrontPageAnnouncement: Boolean(row.is_front_page_announcement),
  };
}

/**
 * Fetch CMS posts for a given type (`news` or `library`), newest first.
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
    .select(CMS_SELECT_COLUMNS)
    .eq('type', type)
    .order('published_at', { ascending: false });
  if (error) {
    return { posts: [], error };
  }
  const posts = (data ?? []).map((row) => rowToPost(row as Row));
  return { posts, error: null };
}

/**
 * News posts promoted to the home dashboard (all signed-in users can open tiles + article).
 */
export async function fetchFrontPageAnnouncementPosts(
  supabase: SupabaseClient | null
): Promise<{ posts: CmsPost[]; error: Error | null }> {
  if (!supabase) {
    return { posts: [], error: null };
  }
  const { data, error } = await supabase
    .from('cms_posts')
    .select(CMS_SELECT_COLUMNS)
    .eq('type', 'news')
    .eq('is_front_page_announcement', true)
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
    .select(CMS_SELECT_COLUMNS)
    .eq('id', id)
    .single();
  if (error || !data) {
    return { post: null, error: error ?? null };
  }
  return { post: rowToPost(data as Row), error: null };
}

export type InsertNewsPostInput = {
  title: string;
  body: string;
  excerpt: string | null;
  authorName: string | null;
  isFrontPageAnnouncement: boolean;
};

/**
 * Insert a news article (admin RLS). Appears in News; optionally on home for everyone.
 */
export async function insertCmsNewsPost(
  supabase: SupabaseClient | null,
  input: InsertNewsPostInput
): Promise<{ id: string | null; error: Error | null }> {
  if (!supabase) {
    return { id: null, error: new Error('Supabase not configured') };
  }
  const { data, error } = await supabase
    .from('cms_posts')
    .insert({
      type: 'news',
      title: input.title.trim(),
      body: input.body,
      excerpt: input.excerpt?.trim() || null,
      author_name: input.authorName?.trim() || null,
      is_front_page_announcement: input.isFrontPageAnnouncement,
    })
    .select('id')
    .single();

  if (error) {
    return { id: null, error };
  }
  return { id: (data as { id: string })?.id ?? null, error: null };
}

/**
 * Toggle home announcement flag (admin RLS). Only meaningful for news posts in the app UI.
 */
export async function setCmsPostFrontPageAnnouncement(
  supabase: SupabaseClient | null,
  postId: string,
  isFrontPageAnnouncement: boolean
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }
  const { error } = await supabase
    .from('cms_posts')
    .update({ is_front_page_announcement: isFrontPageAnnouncement })
    .eq('id', postId);

  return { error: error ?? null };
}

export type UpdateNewsPostInput = {
  title: string;
  body: string;
  excerpt: string | null;
  isFrontPageAnnouncement: boolean;
};

/** Update an existing news article (admin RLS). */
export async function updateCmsNewsPost(
  supabase: SupabaseClient | null,
  postId: string,
  input: UpdateNewsPostInput
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }
  const { error } = await supabase
    .from('cms_posts')
    .update({
      title: input.title.trim(),
      body: input.body,
      excerpt: input.excerpt?.trim() || null,
      is_front_page_announcement: input.isFrontPageAnnouncement,
    })
    .eq('id', postId)
    .eq('type', 'news');

  return { error: error ?? null };
}
