/**
 * CMS post (article) for News and Library.
 * Admin publishes with a type; app filters by type for each section.
 * Legacy DB rows with `type = 'campaign'` are normalized to `news` when read.
 */
export type CmsPostType = 'news' | 'library';

export function normalizeCmsPostType(dbType: string): CmsPostType {
  if (dbType === 'library') return 'library';
  return 'news';
}

export interface CmsPost {
  id: string;
  type: CmsPostType;
  title: string;
  body: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  published_at: string; // ISO
  created_at: string;
  updated_at: string;
  /** When true (typically type `news`): shown on home for all signed-in users; article readable without premium. */
  isFrontPageAnnouncement: boolean;
}
