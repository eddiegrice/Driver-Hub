/**
 * News/updates posts. Stored on device for now; later from backend.
 */
export interface NewsPost {
  id: string;
  title: string;
  /** Plain text body; URLs in the text are made clickable in the UI */
  body: string;
  publishedAt: string; // ISO
  /** Display name, e.g. "PHD Matrix" or admin name */
  authorName: string;
}
