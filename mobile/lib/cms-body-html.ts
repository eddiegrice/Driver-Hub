/**
 * CMS article body: optional HTML subset for rich text in admin + reader.
 * Legacy posts remain plain text (no angle-bracket tags).
 */

/** True if we should render with HTML renderer (heuristic). */
export function isLikelyHtmlContent(s: string): boolean {
  if (!s || !s.includes('<') || !s.includes('>')) return false;
  return /<\/?[a-z][a-z0-9]*\b/i.test(s);
}

/** Plain text for tile snippet when body is HTML. */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Non-empty plain text length for validation (HTML or plain). */
export function cmsBodyPlainTextLength(body: string): number {
  if (isLikelyHtmlContent(body)) return stripHtmlToPlainText(body).length;
  return body.trim().length;
}

/**
 * Remove dangerous constructs before save/display. Editor output is trusted for structure;
 * this blocks scripts, handlers, and common embeds. react-native-render-html does not execute JS.
 */
export function sanitizeCmsBodyHtml(input: string): string {
  let s = input ?? '';
  s = s.replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/\s(on\w+|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/javascript:/gi, 'blocked:');
  s = s.replace(/<\/?(?:iframe|object|embed|meta|link)\b[^>]*>/gi, '');
  return s.trim();
}
