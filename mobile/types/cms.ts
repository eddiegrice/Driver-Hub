/**
 * CMS post (article) for News, Campaigns, Library.
 * Admin publishes with a type; app filters by type for each section.
 */
export type CmsPostType = 'news' | 'campaign' | 'library';

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
}
