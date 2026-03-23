/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/**
 * TicketMaster Discovery API -> Glasgow Events upserter.
 *
 * Uses venue search + venueId event listing when possible (reliable for Barrowland / O2).
 * Falls back to keyword search. Window defaults to 90 days.
 *
 * Required secrets:
 * - TICKETMASTER_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 * - TICKETMASTER_DAYS_AHEAD (default 90)
 * - TICKETMASTER_MIN_INTERVAL_MS — gap between Discovery calls (default 450; raise if 429 persists)
 * - TICKETMASTER_MAX_RETRIES — retries on HTTP 429 (default 6)
 */

import { jsonbSafe, upsertGlasgowEventRowsREST } from '../_shared/glasgow-events-upsert.ts';

type VenueKey = 'ovo_hydro' | 'swg3' | 'barrowlands' | 'o2_academy_glasgow';
type EventSource = 'ticketmaster';

type GlasgowEventRow = {
  source: EventSource;
  external_id: string;
  category: 'gig';
  venue_key: VenueKey;
  venue_name: string;
  title: string;
  start_time: string | null;
  url: string | null;
  raw_payload: any;
  updated_at: string;
};

type VenueTarget = {
  venue_key: VenueKey;
  venue_name: string;
  /** Ticketmaster venue search keyword */
  venueSearchKeyword: string;
  /** Fallback event search keyword */
  eventKeyword: string;
};

const VENUE_TARGETS: VenueTarget[] = [
  { venue_key: 'ovo_hydro', venue_name: 'OVO Hydro', venueSearchKeyword: 'OVO Hydro', eventKeyword: 'OVO Hydro' },
  { venue_key: 'swg3', venue_name: 'SWG3', venueSearchKeyword: 'SWG3', eventKeyword: 'SWG3' },
  {
    venue_key: 'barrowlands',
    venue_name: 'Barrowland Ballroom',
    venueSearchKeyword: 'Barrowland',
    eventKeyword: 'Barrowland',
  },
  {
    venue_key: 'o2_academy_glasgow',
    venue_name: 'O2 Academy Glasgow',
    venueSearchKeyword: 'O2 Academy Glasgow',
    eventKeyword: 'O2 Academy Glasgow',
  },
];

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeStartTime(start: unknown): string | null {
  if (!start) return null;
  if (typeof start !== 'string') return null;
  const s = start.trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function toTicketmasterDateTime(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Discovery API: spike arrest ~5 msg/s, maxBurst 1 — space every call. */
let lastTicketmasterRequestEnd = 0;
function ticketmasterMinIntervalMs(): number {
  const n = Number(Deno.env.get('TICKETMASTER_MIN_INTERVAL_MS') ?? '450');
  return Number.isFinite(n) && n >= 0 ? n : 450;
}

async function throttleTicketmaster(): Promise<void> {
  const minGap = ticketmasterMinIntervalMs();
  if (minGap <= 0) return;
  const elapsed = Date.now() - lastTicketmasterRequestEnd;
  if (elapsed < minGap) await sleep(minGap - elapsed);
}

function markTicketmasterRequestDone(): void {
  lastTicketmasterRequestEnd = Date.now();
}

async function fetchTicketmasterJson(url: string): Promise<any> {
  const maxAttempts = Number(Deno.env.get('TICKETMASTER_MAX_RETRIES') ?? '6');
  const attempts = Number.isFinite(maxAttempts) && maxAttempts >= 1 ? maxAttempts : 6;

  for (let attempt = 0; attempt < attempts; attempt++) {
    await throttleTicketmaster();
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    markTicketmasterRequestDone();

    if (res.status === 429) {
      const body = await res.text();
      let waitMs = 2500 * (attempt + 1);
      const retryAfter = res.headers.get('Retry-After');
      if (retryAfter) {
        const sec = parseInt(retryAfter, 10);
        if (Number.isFinite(sec) && sec > 0) waitMs = Math.max(waitMs, sec * 1000);
      }
      waitMs = Math.min(waitMs, 120_000);
      if (attempt + 1 >= attempts) {
        throw new Error(`Ticketmaster HTTP 429 (rate limit) after ${attempts} tries :: ${body.slice(0, 240)}`);
      }
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ticketmaster HTTP ${res.status} ${url} :: ${body.slice(0, 280)}`);
    }
    return await res.json();
  }
  throw new Error('Ticketmaster: exhausted retries');
}

/**
 * Find a Glasgow venue id. Picks first venue whose name matches all required fragments.
 */
async function searchTicketmasterVenueId(
  apiKey: string,
  keyword: string,
  nameMustInclude: string[]
): Promise<string | null> {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/venues.json');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('city', 'Glasgow');
  url.searchParams.set('countryCode', 'GB');
  url.searchParams.set('locale', 'en-GB');
  url.searchParams.set('size', '30');

  const json = await fetchTicketmasterJson(url.toString());
  const venues = json?._embedded?.venues;
  if (!Array.isArray(venues) || venues.length === 0) return null;

  const lower = (s: string) => s.toLowerCase();
  const frags = nameMustInclude.map((f) => f.toLowerCase());

  for (const v of venues) {
    const n = lower(String(v?.name ?? ''));
    if (frags.every((f) => n.includes(f))) {
      const id = v?.id ? String(v.id) : null;
      if (id) return id;
    }
  }

  const firstId = venues[0]?.id ? String(venues[0].id) : null;
  return firstId;
}

async function fetchEventsByVenueId(params: {
  apiKey: string;
  venueId: string;
  startISO: string;
  endISO: string;
  size?: number;
}): Promise<any[]> {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', params.apiKey);
  url.searchParams.set('venueId', params.venueId);
  url.searchParams.set('startDateTime', params.startISO);
  url.searchParams.set('endDateTime', params.endISO);
  url.searchParams.set('locale', 'en-GB');
  url.searchParams.set('size', String(params.size ?? 50));

  const json = await fetchTicketmasterJson(url.toString());
  const events = json?._embedded?.events;
  if (!Array.isArray(events)) return [];
  return events;
}

async function fetchEventsByKeyword(params: {
  apiKey: string;
  keyword: string;
  startISO: string;
  endISO: string;
  size?: number;
}): Promise<any[]> {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', params.apiKey);
  url.searchParams.set('keyword', params.keyword);
  url.searchParams.set('startDateTime', params.startISO);
  url.searchParams.set('endDateTime', params.endISO);
  url.searchParams.set('locale', 'en-GB');
  url.searchParams.set('city', 'Glasgow');
  url.searchParams.set('countryCode', 'GB');
  url.searchParams.set('size', String(params.size ?? 50));

  const json = await fetchTicketmasterJson(url.toString());
  const events = json?._embedded?.events;
  if (!Array.isArray(events)) return [];
  return events;
}

function getVenueNameFromTicketmasterEvent(event: any): string | undefined {
  const embedded = event?._embedded;
  const venues = embedded?.venues;
  if (Array.isArray(venues) && venues[0]?.name) return String(venues[0].name);
  const standaloneVenueName = embedded?.venue?.name ?? embedded?.venueName ?? event?.venue?.name;
  if (typeof standaloneVenueName === 'string') return standaloneVenueName;
  return undefined;
}

/** Fallback matcher when not using venueId (keyword results). */
function inferVenueKeyFromName(venueName: string | undefined, expected: VenueKey): boolean {
  if (!venueName) return false;
  const v = venueName.toLowerCase();
  switch (expected) {
    case 'o2_academy_glasgow':
      return v.includes('o2') && v.includes('academy') && v.includes('glasgow');
    case 'barrowlands':
      return v.includes('barrowland');
    case 'ovo_hydro':
      return v.includes('ovo hydro') || v.includes('sse hydro');
    case 'swg3':
      return v.includes('swg3') || v.includes('swg 3');
    default:
      return false;
  }
}

async function run(): Promise<{ ticketmasterEventsUpserted: number; venues: Record<string, number> }> {
  const apiKey = getEnv('TICKETMASTER_API_KEY');
  const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const now = new Date();
  const startISO = toTicketmasterDateTime(now);
  const daysAhead = Number(Deno.env.get('TICKETMASTER_DAYS_AHEAD') ?? '90') || 90;
  const endISO = toTicketmasterDateTime(new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000));

  const allRows: GlasgowEventRow[] = [];
  const venuesCount: Record<string, number> = {};

  for (const t of VENUE_TARGETS) {
    let events: any[] = [];

    const nameFragments =
      t.venue_key === 'barrowlands'
        ? ['barrowland']
        : t.venue_key === 'o2_academy_glasgow'
          ? ['o2', 'academy', 'glasgow']
          : [t.venueSearchKeyword.toLowerCase()];

    const venueId = await searchTicketmasterVenueId(apiKey, t.venueSearchKeyword, nameFragments);
    if (venueId) {
      try {
        events = await fetchEventsByVenueId({
          apiKey,
          venueId,
          startISO,
          endISO,
          size: 50,
        });
      } catch {
        events = [];
      }
    }

    if (events.length === 0) {
      events = await fetchEventsByKeyword({
        apiKey,
        keyword: t.eventKeyword,
        startISO,
        endISO,
        size: 50,
      });
    }

    for (const ev of events) {
      const external_id = ev?.id ? String(ev.id) : null;
      if (!external_id) continue;

      if (venueId) {
        // Listed by venueId — trust target.
      } else {
        const venueName = getVenueNameFromTicketmasterEvent(ev);
        if (!inferVenueKeyFromName(venueName, t.venue_key)) continue;
      }

      const start_time = normalizeStartTime(ev?.dates?.start?.dateTime ?? ev?.dates?.start?.localDate ?? ev?.dates?.start);
      if (!start_time) continue;

      const title = typeof ev?.name === 'string' ? ev.name : 'TicketMaster event';
      if (title.toLowerCase().startsWith('venue premium -')) continue;
      const url = typeof ev?.url === 'string' ? ev.url : null;

      const row: GlasgowEventRow = {
        source: 'ticketmaster',
        external_id,
        category: 'gig',
        venue_key: t.venue_key,
        venue_name: t.venue_name,
        title,
        start_time,
        url,
        raw_payload: ev,
        updated_at: new Date().toISOString(),
      };

      allRows.push(row);
      venuesCount[row.venue_key] = (venuesCount[row.venue_key] ?? 0) + 1;
    }
  }

  if (allRows.length === 0) {
    return { ticketmasterEventsUpserted: 0, venues: venuesCount };
  }

  await upsertGlasgowEventRowsREST(
    supabaseUrl,
    serviceKey,
    allRows.map((r) => ({
      source: r.source,
      external_id: r.external_id,
      category: r.category,
      venue_key: r.venue_key,
      venue_name: r.venue_name,
      title: r.title,
      start_time: r.start_time,
      url: r.url,
      raw_payload: jsonbSafe(r.raw_payload),
      updated_at: r.updated_at,
    })),
    'glasgow_events (ticketmaster)'
  );

  return { ticketmasterEventsUpserted: allRows.length, venues: venuesCount };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const summary = await run();
    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
