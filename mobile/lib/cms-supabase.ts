import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeCmsPostType, type CmsPost, type CmsPostType } from '@/types/cms';

const CMS_SELECT_COLUMNS =
  'id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at, is_front_page_announcement';

async function messageFromFunctionsInvoke(
  err: unknown,
  response?: Response
): Promise<string> {
  const res = response ?? (err && typeof err === 'object' && 'context' in err
    ? (err as { context?: Response }).context
    : undefined);
  let detail = '';
  if (res) {
    try {
      const ct = res.headers.get('Content-Type') ?? '';
      if (ct.includes('application/json')) {
        const j = (await res.clone().json()) as { error?: string; message?: string };
        detail = (j.error ?? j.message ?? '').trim();
      } else {
        const t = (await res.clone().text()).trim();
        if (t) detail = t.slice(0, 400);
      }
    } catch {
      /* ignore */
    }
  }
  const status = res?.status;
  const base = err instanceof Error ? err.message : String(err);
  if (detail) return status ? `${base} (HTTP ${status}): ${detail}` : `${base}: ${detail}`;
  if (status) return `${base} (HTTP ${status})`;
  return base;
}

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
  thumbnailUrl?: string | null;
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
      thumbnail_url: input.thumbnailUrl ?? null,
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
  thumbnailUrl?: string | null;
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
      ...(input.thumbnailUrl !== undefined ? { thumbnail_url: input.thumbnailUrl } : null),
      is_front_page_announcement: input.isFrontPageAnnouncement,
    })
    .eq('id', postId)
    .eq('type', 'news');

  return { error: error ?? null };
}

export type InsertLibraryPostInput = {
  title: string;
  body: string;
  authorName: string | null;
};

/**
 * Insert a guidance library article (admin RLS). `type` is `library`; no excerpt/thumbnail in app UI.
 */
export async function insertCmsLibraryPost(
  supabase: SupabaseClient | null,
  input: InsertLibraryPostInput
): Promise<{ id: string | null; error: Error | null }> {
  if (!supabase) {
    return { id: null, error: new Error('Supabase not configured') };
  }
  const { data, error } = await supabase
    .from('cms_posts')
    .insert({
      type: 'library',
      title: input.title.trim(),
      body: input.body,
      excerpt: null,
      thumbnail_url: null,
      author_name: input.authorName?.trim() || null,
      is_front_page_announcement: false,
    })
    .select('id')
    .single();

  if (error) {
    return { id: null, error };
  }
  return { id: (data as { id: string })?.id ?? null, error: null };
}

export type UpdateLibraryPostInput = {
  title: string;
  body: string;
};

/** Update a guidance library article (admin RLS). Clears excerpt and thumbnail (library uses title-only list). */
export async function updateCmsLibraryPost(
  supabase: SupabaseClient | null,
  postId: string,
  input: UpdateLibraryPostInput
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }
  const { error } = await supabase
    .from('cms_posts')
    .update({
      title: input.title.trim(),
      body: input.body,
      excerpt: null,
      thumbnail_url: null,
      is_front_page_announcement: false,
    })
    .eq('id', postId)
    .eq('type', 'library');

  return { error: error ?? null };
}

export async function uploadCmsPostImage(
  supabase: SupabaseClient | null,
  opts: { postId: string; localUri: string; mimeType?: string | null }
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!supabase) {
    return { publicUrl: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data: refreshed } = await supabase.auth.refreshSession();
    let session = refreshed.session;
    if (!session) {
      const { data: again } = await supabase.auth.getSession();
      session = again.session ?? null;
    }
    const authedUserId = session?.user?.id ?? null;
    if (!authedUserId) return { publicUrl: null, error: new Error('Not signed in.') };

    // Validate admin state according to DB (same function used by Storage RLS policies).
    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_current_user_admin');
    if (adminErr) {
      return { publicUrl: null, error: new Error(`Admin check failed before upload: ${adminErr.message}`) };
    }
    if (!isAdmin) {
      return {
        publicUrl: null,
        error: new Error(
          `Upload blocked: current user is not admin (session user id ${authedUserId ?? 'unknown'}).`
        ),
      };
    }

    const mime = opts.mimeType ?? 'image/jpeg';
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const token = session?.access_token;
    if (!token) return { publicUrl: null, error: new Error('Not signed in (no access token).') };

    const form = new FormData();
    form.append('postId', opts.postId);
    form.append('mimeType', mime);
    // React Native file upload shape (not web File/Blob).
    form.append('file', { uri: opts.localUri, type: mime, name: `upload.${ext}` } as never);

    const { data, error, response } = await supabase.functions.invoke('cms-upload-image', {
      body: form,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) {
      const msg = await messageFromFunctionsInvoke(error, response);
      return { publicUrl: null, error: new Error(msg) };
    }
    if (!data?.ok || !data?.publicUrl) {
      return { publicUrl: null, error: new Error((data as { error?: string })?.error ?? 'Upload failed') };
    }

    return { publicUrl: data.publicUrl as string, error: null };
  } catch (e) {
    return {
      publicUrl: null,
      error: e instanceof Error ? e : new Error('Failed to read/upload image.'),
    };
  }
}
