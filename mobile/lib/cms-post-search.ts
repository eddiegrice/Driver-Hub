import { isLikelyHtmlContent, stripHtmlToPlainText } from '@/lib/cms-body-html';
import type { CmsPost } from '@/types/cms';

/** Case-insensitive match on title, optional excerpt, and plain-text body. */
export function cmsPostMatchesSearch(post: CmsPost, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  if (post.title.toLowerCase().includes(q)) return true;
  if (post.excerpt?.toLowerCase().includes(q)) return true;
  const raw = post.body ?? '';
  const plain = isLikelyHtmlContent(raw) ? stripHtmlToPlainText(raw) : raw;
  return plain.toLowerCase().includes(q);
}

export type CmsPostTitleSort = 'title_az' | 'title_za';

export const CMS_POST_TITLE_SORT_PILLS: { key: CmsPostTitleSort; label: string }[] = [
  { key: 'title_az', label: 'A–Z' },
  { key: 'title_za', label: 'Z–A' },
];

export function sortCmsPostsByTitle(list: CmsPost[], sort: CmsPostTitleSort): CmsPost[] {
  const out = [...list];
  if (sort === 'title_az') {
    return out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }
  return out.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: 'base' }));
}
