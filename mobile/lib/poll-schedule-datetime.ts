/**
 * Poll / survey schedule: display as DD-MM-YYYY + local time; store as ISO in DB.
 */

export function formatPollDateDdMmYyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}-${mo}-${y}`;
}

export function formatPollTimeHhMm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Parse DD-MM-YYYY; invalid calendar dates return null. */
export function parsePollDateDdMmYyyy(s: string): { y: number; m0: number; d: number } | null {
  const t = s.trim();
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(t);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return { y, m0: mo, d };
}

/** Parse H:M or HH:MM (24h). */
export function parsePollTimeHhMm(s: string): { h: number; min: number } | null {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

export function combineDdMmYyyyAndTime(dateStr: string, timeStr: string): Date | null {
  const pd = parsePollDateDdMmYyyy(dateStr);
  const pt = parsePollTimeHhMm(timeStr);
  if (!pd || !pt) return null;
  const dt = new Date(pd.y, pd.m0, pd.d, pt.h, pt.min, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function validatePublishCloseOrder(publishAt: Date, closeAt: Date): boolean {
  return closeAt.getTime() > publishAt.getTime();
}

export function datesToIsoOrError(
  publishAt: Date,
  closeAt: Date
): { ok: true; publishAt: string; closeAt: string } | { ok: false; message: string } {
  if (!validatePublishCloseOrder(publishAt, closeAt)) {
    return { ok: false, message: 'Close must be after publish.' };
  }
  return { ok: true, publishAt: publishAt.toISOString(), closeAt: closeAt.toISOString() };
}
