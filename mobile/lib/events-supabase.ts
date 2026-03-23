import type { SupabaseClient } from '@supabase/supabase-js';

import type { EventCategory, EventSource, GlasgowEventBannerRow, GlasgowVenueKey } from '@/types/events';

export const GLASGOW_EVENT_VENUE_ORDER: GlasgowVenueKey[] = [
  'ovo_hydro',
  'swg3',
  'barrowlands',
  'o2_academy_glasgow',
  'celtic_park',
  'ibrox',
  'partick_thistle',
  'hampden',
];

/** Gigs / shows row on the home banner (left → right). */
export const GLASGOW_GIG_VENUE_ORDER: GlasgowVenueKey[] = [
  'ovo_hydro',
  'swg3',
  'barrowlands',
  'o2_academy_glasgow',
];

/** Sports fixtures: top row then bottom row on the home banner. */
export const GLASGOW_FIXTURE_VENUE_ROWS: GlasgowVenueKey[][] = [
  ['celtic_park', 'ibrox'],
  ['partick_thistle', 'hampden'],
];

const venueNameFallback: Record<GlasgowVenueKey, string> = {
  ovo_hydro: 'OVO Hydro',
  swg3: 'SWG3',
  barrowlands: 'Barrowland Ballroom',
  o2_academy_glasgow: 'O2 Academy Glasgow',
  celtic_park: 'Celtic Park (Parkhead)',
  ibrox: 'Ibrox',
  partick_thistle: 'Firhill (Partick Thistle)',
  hampden: 'Hampden Stadium',
};

function asVenueKey(v: any): GlasgowVenueKey | null {
  if (typeof v !== 'string') return null;
  const key = v as GlasgowVenueKey;
  return GLASGOW_EVENT_VENUE_ORDER.includes(key) ? key : null;
}

function asCategory(v: any): EventCategory | null {
  if (v === 'gig') return 'gig';
  if (v === 'sport') return 'sport';
  return null;
}

function asSource(v: any): EventSource | null {
  if (v === 'ticketmaster') return 'ticketmaster';
  if (v === 'sportsdb') return 'sportsdb';
  return null;
}

function rowToBannerRow(row: any): GlasgowEventBannerRow | null {
  const venueKey = asVenueKey(row?.venue_key);
  const category = asCategory(row?.category);
  const source = asSource(row?.source);
  const externalId = row?.external_id ? String(row.external_id) : null;
  const title = row?.title ? String(row.title) : null;

  if (!venueKey || !category || !source || !externalId || !title) return null;

  return {
    venueKey,
    venueName: row?.venue_name ? String(row.venue_name) : venueNameFallback[venueKey],
    category,
    source,
    externalId,
    title,
    startTime: row?.start_time ? String(row.start_time) : null,
    homeTeam: row?.home_team ? String(row.home_team) : null,
    awayTeam: row?.away_team ? String(row.away_team) : null,
    url: row?.url ? String(row.url) : null,
    status: row?.status ? String(row.status) : null,
  };
}

/**
 * Fetch upcoming events for the Glasgow Events banner.
 *
 * Returns one (the next) upcoming event per venue key (up to 6 total),
 * sorted in the fixed venue order.
 */
export async function fetchGlasgowEventsForBanner(
  supabase: SupabaseClient | null
): Promise<{ rows: GlasgowEventBannerRow[]; error: Error | null }> {
  if (!supabase) return { rows: [], error: null };

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('glasgow_events')
    .select('source, external_id, category, venue_key, venue_name, title, start_time, home_team, away_team, url, status')
    .gt('start_time', nowIso)
    .in('venue_key', GLASGOW_EVENT_VENUE_ORDER)
    .order('start_time', { ascending: true })
    .limit(200);

  if (error) {
    return { rows: [], error: error as unknown as Error };
  }

  const rows = (data ?? []).map(rowToBannerRow).filter((r): r is GlasgowEventBannerRow => Boolean(r));

  // Pick the earliest upcoming event for each venueKey.
  const picked = new Map<GlasgowVenueKey, GlasgowEventBannerRow>();
  for (const row of rows) {
    if (picked.has(row.venueKey)) continue;
    picked.set(row.venueKey, row);
    if (picked.size >= GLASGOW_EVENT_VENUE_ORDER.length) break;
  }

  const orderedRows: GlasgowEventBannerRow[] = GLASGOW_EVENT_VENUE_ORDER
    .map((key) => picked.get(key))
    .filter((r): r is GlasgowEventBannerRow => Boolean(r));

  return { rows: orderedRows, error: null };
}

