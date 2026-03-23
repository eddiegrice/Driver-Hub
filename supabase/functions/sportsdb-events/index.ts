/**
 * TheSportsDB API -> Glasgow Events upserter.
 *
 * Resilience: SportsDB / network errors are caught per request; we continue and still upsert
 * whatever rows we collected. HTTP response is always 200 with JSON: { ok, sportsdbEventsUpserted,
 * warnings?, error? } so you can see what failed without relying on opaque 500s.
 *
 * Required secrets: SPORTSDB_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Why so many API calls before? TheSportsDB has NO "events at Celtic Park" endpoint. The heavy mode
 * pulled whole SPL/Championship *rounds* (every fixture in Scotland) and filtered to your 3 clubs'
 * home games — correct but wasteful. Default now: **team-first** (`eventsnext` per club + national
 * teams for Hampden). Opt-in league scan only if home SPL games go missing (e.g. next 5 are Europe).
 *
 * - SPORTSDB_INCLUDE_LEAGUE_ROUND_SCAN — `true` to also fetch league rounds (heavy). Default **false**.
 * - SPORTSDB_MAX_DURATION_MS, SPORTSDB_ROUNDS_WINDOW (when scan on), SPORTSDB_REQUEST_DELAY_MS,
 *   SPORTSDB_MAX_LOOKUPEVENT_CALLS — see below / env.
 * Optional: SCOTTISH_FOOTBALL_LEAGUE_IDS, SPORTSDB_*, team IDs, …
 *
 * NOTE: PostgREST upsert helpers are inlined here (no ../_shared import). Some deploy paths
 * omit sibling `_shared` files and the worker fails at import time — no logs, opaque 500.
 *
 * Bump this when debugging deploy mismatches (must appear in JSON body).
 */
const SPORTSDB_FN_BUILD_ID = 'inline-2026-03-20-teams-first';

type UpsertRow = Record<string, unknown>;

function jsonResponse(obj: Record<string, unknown>, status = 200): Response {
  try {
    const body = JSON.stringify({ fn: 'sportsdb-events', build: SPORTSDB_FN_BUILD_ID, ...obj });
    return new Response(body, {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(
      `{"fn":"sportsdb-events","build":"${SPORTSDB_FN_BUILD_ID}","ok":false,"error":"json_stringify_failed"}`,
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

function jsonbSafe(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

async function upsertGlasgowEventRowsREST(
  supabaseUrl: string,
  serviceRoleKey: string,
  rows: UpsertRow[],
  contextLabel: string
): Promise<void> {
  if (rows.length === 0) return;

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/rest/v1/glasgow_events?on_conflict=source,external_id`;

  const chunkSizeRaw = Number(Deno.env.get('GLASGOW_EVENTS_UPSERT_CHUNK') ?? '80');
  const chunkSize = Number.isFinite(chunkSizeRaw) && chunkSizeRaw > 0 ? Math.min(chunkSizeRaw, 200) : 80;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    let body: string;
    try {
      body = JSON.stringify(chunk);
    } catch (e) {
      throw new Error(`${contextLabel}: JSON.stringify failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    let res: Response;
    try {
      res = await fetch(endpoint, { method: 'POST', headers, body });
    } catch (firstNet) {
      await new Promise((r) => setTimeout(r, 750));
      try {
        res = await fetch(endpoint, { method: 'POST', headers, body });
      } catch {
        throw new Error(
          `${contextLabel}: network error calling PostgREST (${firstNet instanceof Error ? firstNet.message : String(firstNet)})`
        );
      }
    }

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${contextLabel}: REST ${res.status} ${t.slice(0, 500)}`);
    }
  }
}

type VenueKey = 'celtic_park' | 'ibrox' | 'partick_thistle' | 'hampden';
type EventSource = 'sportsdb';

type GlasgowEventRow = {
  source: EventSource;
  external_id: string;
  category: 'sport';
  venue_key: VenueKey;
  venue_name: string;
  title: string;
  start_time: string | null;
  home_team: string | null;
  away_team: string | null;
  url: string | null;
  status: string | null;
  raw_payload: any;
  updated_at: string;
};

/** Returned to the client (HTTP 200 with this body for normal outcomes). */
type SportsdbRunResult = {
  ok: boolean;
  sportsdbEventsUpserted: number;
  /** Non-fatal issues (skipped rounds, lookup failures, etc.) */
  warnings?: string[];
  /** Fatal to this run: missing secrets, upsert failed, etc. */
  error?: string;
  /** True if we stopped fetching rounds to stay under SPORTSDB_MAX_DURATION_MS */
  stoppedForTimeBudget?: boolean;
  /** teams_next_only = cheap; league_rounds = also scanned SPL/Championship rounds */
  fetchMode?: string;
};

const DEFAULT_SPL_LEAGUE_ID = '4330';
const DEFAULT_CHAMPIONSHIP_LEAGUE_ID = '4395';
const MAX_LEAGUE_ROUND_CAP = 50;
const MAX_WARNINGS = 40;

function pushWarning(warnings: string[], msg: string): void {
  if (warnings.length >= MAX_WARNINGS) return;
  warnings.push(msg.length > 500 ? `${msg.slice(0, 500)}…` : msg);
}

function getEnvOrNull(name: string): string | null {
  const v = Deno.env.get(name);
  return v && v.trim() ? v.trim() : null;
}

function normalizeVenueKeyFromVenue(venue: string | undefined | null): { venue_key: VenueKey; venue_name: string } | null {
  if (!venue) return null;
  const v = String(venue).toLowerCase();

  if (v.includes('celtic park') || v.includes('parkhead')) {
    return { venue_key: 'celtic_park', venue_name: 'Celtic Park (Parkhead)' };
  }
  if (v.includes('ibrox')) {
    return { venue_key: 'ibrox', venue_name: 'Ibrox' };
  }
  if (v.includes('firhill') || v.includes('partick thistle')) {
    return { venue_key: 'partick_thistle', venue_name: 'Firhill (Partick Thistle)' };
  }
  if (v.includes('hampden')) {
    return { venue_key: 'hampden', venue_name: 'Hampden Stadium' };
  }
  return null;
}

function timePartToHMS(t: string): string | null {
  const s = t.trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

function parseStrTimestamp(strTimestamp: string | undefined | null): string | null {
  if (!strTimestamp || typeof strTimestamp !== 'string') return null;
  const t = strTimestamp.trim();
  if (!t) return null;
  const hasZone = /[zZ]$/.test(t) || /[+-]\d{2}:\d{2}$/.test(t);
  const normalized = hasZone ? t : `${t}Z`;
  const d = new Date(normalized);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function parseSportsDbStartTime(dateEvent: string | undefined | null, strTime: string | undefined | null): string | null {
  if (!dateEvent) return null;
  const date = String(dateEvent).trim();
  if (!date) return null;
  const timeRaw = typeof strTime === 'string' ? strTime.trim() : '';
  const hms = timeRaw ? timePartToHMS(timeRaw) : null;
  if (hms) {
    const d = new Date(`${date}T${hms}Z`);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toISOString();
  }
  const d = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function isLikelyDateOnlyMidnight(iso: string | null): boolean {
  if (!iso) return true;
  return /T00:00:00\.000Z$/.test(iso);
}

function resolveStartTimeFromEvent(ev: any): string | null {
  const fromTs = parseStrTimestamp(ev?.strTimestamp);
  if (fromTs) return fromTs;
  return parseSportsDbStartTime(ev?.dateEvent, ev?.strTime);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestDelayMs(): number {
  const n = Number(Deno.env.get('SPORTSDB_REQUEST_DELAY_MS') ?? '200');
  return Number.isFinite(n) && n >= 0 ? n : 200;
}

/** Wall-clock budget for TheSportsDB fetch phase (then upsert runs after). */
function maxRunDurationMs(): number {
  const n = Number(Deno.env.get('SPORTSDB_MAX_DURATION_MS') ?? '45000');
  if (!Number.isFinite(n)) return 45_000;
  return Math.min(Math.max(n, 20_000), 110_000);
}

function maxLookupEventCalls(): number {
  const n = Number(Deno.env.get('SPORTSDB_MAX_LOOKUPEVENT_CALLS') ?? '20');
  if (!Number.isFinite(n) || n < 0) return 20;
  return Math.min(n, 200);
}

type LookupBudget = { used: number; max: number };

async function sportsDbGetThrowing(apiKey: string, path: string): Promise<any> {
  const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(apiKey)}/${path}`;
  const maxAttempts = Number(Deno.env.get('SPORTSDB_MAX_RETRIES') ?? '4');
  const attempts = Number.isFinite(maxAttempts) && maxAttempts >= 1 ? maxAttempts : 4;
  let backoffMs = Number(Deno.env.get('SPORTSDB_429_INITIAL_WAIT_MS') ?? '2500');
  if (!Number.isFinite(backoffMs) || backoffMs < 500) backoffMs = 2500;
  const cap429Wait = Number(Deno.env.get('SPORTSDB_429_MAX_WAIT_MS') ?? '6000');
  const max429Wait = Number.isFinite(cap429Wait) && cap429Wait >= 1000 ? cap429Wait : 6000;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { accept: 'application/json' } });
    } catch (netErr) {
      throw new Error(
        `SportsDB network ${path}: ${netErr instanceof Error ? netErr.message : String(netErr)}`
      );
    }

    if (res.status === 429 || res.status === 503) {
      const ra = res.headers.get('Retry-After');
      let waitMs = ra ? parseInt(ra, 10) * 1000 : NaN;
      if (!Number.isFinite(waitMs) || waitMs < 1000) waitMs = backoffMs;
      waitMs = Math.min(waitMs, 90_000, max429Wait);
      await sleep(waitMs);
      backoffMs = Math.min(backoffMs * 2, 60_000);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SportsDB HTTP ${res.status} (${path}) :: ${text.slice(0, 200)}`);
    }
    const text = await res.text();
    const trimmed = text.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      throw new Error(`SportsDB: not JSON (${path}) :: ${trimmed.slice(0, 160)}`);
    }
  }
  throw new Error(`SportsDB: rate limited after ${attempts} attempts (${path})`);
}

/** Single SportsDB call — never throws; logs into warnings. */
async function sportsDbGetSafe(apiKey: string, path: string, warnings: string[]): Promise<Record<string, unknown> | null> {
  try {
    return await sportsDbGetThrowing(apiKey, path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushWarning(warnings, msg);
    return null;
  }
}

async function pace(): Promise<void> {
  const d = requestDelayMs();
  if (d > 0) await sleep(d);
}

async function searchTeamIdScottish(
  apiKey: string,
  teamName: string,
  warnings: string[]
): Promise<string | null> {
  const json = await sportsDbGetSafe(apiKey, `searchteams.php?t=${encodeURIComponent(teamName)}`, warnings);
  if (!json) return null;
  const teams = json.teams;
  if (!Array.isArray(teams) || teams.length === 0) return null;

  const want = teamName.toLowerCase().trim();
  const soccerScot = teams.filter(
    (t: any) =>
      String(t?.strSport ?? '').toLowerCase() === 'soccer' && String(t?.strCountry ?? '') === 'Scotland'
  );
  const pool = soccerScot.length > 0 ? soccerScot : teams;
  const exact = pool.find((t: any) => String(t?.strTeam ?? '').toLowerCase() === want);
  const picked = exact ?? pool[0];
  return picked?.idTeam ? String(picked.idTeam) : null;
}

async function fetchNextEvents(apiKey: string, teamId: string, warnings: string[]): Promise<any[]> {
  const json = await sportsDbGetSafe(apiKey, `eventsnext.php?id=${encodeURIComponent(teamId)}`, warnings);
  if (!json) return [];
  const events = json.events;
  if (!Array.isArray(events)) return [];
  return events;
}

async function fetchLastEvents(apiKey: string, teamId: string, warnings: string[]): Promise<any[]> {
  const json = await sportsDbGetSafe(apiKey, `eventslast.php?id=${encodeURIComponent(teamId)}`, warnings);
  if (!json) return [];
  const raw = json.results ?? json.events;
  if (!Array.isArray(raw)) return [];
  return raw;
}

async function fetchEventsRound(apiKey: string, leagueId: string, round: number, warnings: string[]): Promise<any[]> {
  const json = await sportsDbGetSafe(
    apiKey,
    `eventsround.php?id=${encodeURIComponent(leagueId)}&r=${encodeURIComponent(String(round))}`,
    warnings
  );
  if (!json) return [];
  const events = json.events;
  if (!Array.isArray(events)) return [];
  return events;
}

function firstIntRoundForLeague(events: any[], leagueId: string): number | null {
  for (const ev of events) {
    if (String(ev?.idLeague ?? '') !== String(leagueId)) continue;
    if (ev?.intRound == null) continue;
    const r = Number(ev.intRound);
    if (Number.isFinite(r)) return r;
  }
  return null;
}

async function inferRoundWindowStart(
  apiKey: string,
  leagueId: string,
  teamIds: (string | null | undefined)[],
  warnings: string[]
): Promise<number> {
  const ids = teamIds.filter((x): x is string => Boolean(x));

  const fromNext: number[] = [];
  for (const tid of ids) {
    const evs = await fetchNextEvents(apiKey, tid, warnings);
    const r = firstIntRoundForLeague(evs, leagueId);
    if (r != null) fromNext.push(r);
    await pace();
  }
  if (fromNext.length > 0) {
    return Math.max(1, Math.min(...fromNext) - 1);
  }

  const fromLast: number[] = [];
  for (const tid of ids) {
    const evs = await fetchLastEvents(apiKey, tid, warnings);
    const r = firstIntRoundForLeague(evs, leagueId);
    if (r != null) fromLast.push(r);
    await pace();
  }
  if (fromLast.length > 0) {
    return Math.max(1, Math.max(...fromLast));
  }

  const fb = Number(Deno.env.get('SPORTSDB_FALLBACK_START_ROUND') ?? '22');
  pushWarning(warnings, `League ${leagueId}: no round from eventsnext/eventslast; using fallback start round`);
  return Number.isFinite(fb) && fb >= 1 ? fb : 22;
}

async function lookupEvent(
  apiKey: string,
  idEvent: string,
  cache: Map<string, any>,
  warnings: string[],
  lookupBudget: LookupBudget
): Promise<any | null> {
  if (cache.has(idEvent)) return cache.get(idEvent);
  if (lookupBudget.used >= lookupBudget.max) {
    return null;
  }
  lookupBudget.used += 1;
  const json = await sportsDbGetSafe(apiKey, `lookupevent.php?id=${encodeURIComponent(idEvent)}`, warnings);
  if (!json) {
    cache.set(idEvent, null);
    return null;
  }
  const arr = json.events;
  const ev = Array.isArray(arr) && arr[0] ? arr[0] : null;
  cache.set(idEvent, ev);
  return ev;
}

async function resolveKickoffISO(
  apiKey: string,
  ev: any,
  cache: Map<string, any>,
  warnings: string[],
  lookupBudget: LookupBudget
): Promise<string | null> {
  try {
    let start = resolveStartTimeFromEvent(ev);
    const idEvent = ev?.idEvent ? String(ev.idEvent) : null;
    const hasTime = String(ev?.strTime ?? '').trim().length > 0;
    const hasTs = typeof ev?.strTimestamp === 'string' && ev.strTimestamp.trim().length > 0;

    const needsLookup = Boolean(idEvent) && (isLikelyDateOnlyMidnight(start) || (!hasTs && !hasTime));

    if (needsLookup && idEvent) {
      const detail = await lookupEvent(apiKey, idEvent, cache, warnings, lookupBudget);
      if (detail) {
        const fromDetail = resolveStartTimeFromEvent(detail);
        if (fromDetail && !isLikelyDateOnlyMidnight(fromDetail)) {
          return fromDetail;
        }
      }
    }
    return start;
  } catch (e) {
    pushWarning(warnings, `kickoff idEvent=${ev?.idEvent}: ${e instanceof Error ? e.message : String(e)}`);
    return resolveStartTimeFromEvent(ev);
  }
}

function isUpcomingOrLive(ev: any, startISO: string | null, nowMs: number): boolean {
  if (!startISO) return false;
  const status = String(ev?.strStatus ?? '').toLowerCase();
  if (status.includes('finished')) return false;
  const startMs = Date.parse(startISO);
  if (!Number.isFinite(startMs)) return false;
  if (startMs < nowMs - 6 * 60 * 60 * 1000) return false;
  return true;
}

function eventToRow(
  ev: any,
  inferred: { venue_key: VenueKey; venue_name: string },
  startISO: string | null
): GlasgowEventRow | null {
  const external_id = ev?.idEvent ? String(ev.idEvent) : null;
  if (!external_id || !startISO) return null;

  const home_team = ev?.strHomeTeam ? String(ev.strHomeTeam) : null;
  const away_team = ev?.strAwayTeam ? String(ev.strAwayTeam) : null;

  const title =
    typeof ev?.strEvent === 'string' && ev.strEvent.trim()
      ? ev.strEvent
      : home_team && away_team
        ? `${home_team} vs ${away_team}`
        : 'Sports event';

  return {
    source: 'sportsdb',
    external_id,
    category: 'sport',
    venue_key: inferred.venue_key,
    venue_name: inferred.venue_name,
    title,
    start_time: startISO,
    home_team,
    away_team,
    url: typeof ev?.strWebsite === 'string' ? ev.strWebsite : null,
    status: ev?.strStatus ? String(ev.strStatus) : null,
    raw_payload: ev,
    updated_at: new Date().toISOString(),
  };
}

function parseLeagueIds(): string[] {
  const raw = Deno.env.get('SCOTTISH_FOOTBALL_LEAGUE_IDS')?.trim();
  if (raw) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [DEFAULT_SPL_LEAGUE_ID, DEFAULT_CHAMPIONSHIP_LEAGUE_ID];
}

/** Heavy: fetch every fixture in SPL/Championship rounds then filter to our home games. */
function includeLeagueRoundScan(): boolean {
  const v = Deno.env.get('SPORTSDB_INCLUDE_LEAGUE_ROUND_SCAN')?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function run(): Promise<SportsdbRunResult> {
  const warnings: string[] = [];
  const fetchDeadline = Date.now() + maxRunDurationMs();
  let stoppedForTimeBudget = false;
  const lookupBudget: LookupBudget = { used: 0, max: maxLookupEventCalls() };

  const apiKey = getEnvOrNull('SPORTSDB_API_KEY');
  const supabaseUrlRaw = getEnvOrNull('SUPABASE_URL');
  const serviceKey = getEnvOrNull('SUPABASE_SERVICE_ROLE_KEY');

  const fetchMode = includeLeagueRoundScan() ? 'teams_next_plus_league_rounds' : 'teams_next_only';

  if (!apiKey) {
    return { ok: false, sportsdbEventsUpserted: 0, error: 'Missing secret/env: SPORTSDB_API_KEY', fetchMode };
  }
  if (!supabaseUrlRaw) {
    return { ok: false, sportsdbEventsUpserted: 0, error: 'Missing secret/env: SUPABASE_URL', fetchMode };
  }
  if (!serviceKey) {
    return { ok: false, sportsdbEventsUpserted: 0, error: 'Missing secret/env: SUPABASE_SERVICE_ROLE_KEY', fetchMode };
  }

  const supabaseUrl = supabaseUrlRaw.replace(/\/$/, '');
  const leagueIds = parseLeagueIds();

  const lookupCache = new Map<string, any>();
  const nowMs = Date.now();

  const celticId =
    getEnvOrNull('CELTIC_TEAM_ID') || (await searchTeamIdScottish(apiKey, 'Celtic', warnings));
  await pace();
  const rangersId =
    getEnvOrNull('RANGERS_TEAM_ID') || (await searchTeamIdScottish(apiKey, 'Rangers', warnings));
  await pace();
  const partickId =
    getEnvOrNull('PARTICK_THISTLE_TEAM_ID') ||
    (await searchTeamIdScottish(apiKey, 'Partick Thistle', warnings));

  if (!celticId) pushWarning(warnings, 'Celtic team id unresolved — Celtic Park home games will be skipped');
  if (!rangersId) pushWarning(warnings, 'Rangers team id unresolved — Ibrox home games will be skipped');
  if (!partickId) pushWarning(warnings, 'Partick Thistle team id unresolved — Firhill home games will be skipped');

  const teamNamesNational = ['Scotland', "Queen's Park"];
  const rowByExternalId = new Map<string, GlasgowEventRow>();

  const tryAddRow = async (ev: any) => {
    try {
      const venueCandidate = ev?.strVenue ?? ev?.strStadium ?? null;
      const inferred = normalizeVenueKeyFromVenue(venueCandidate);
      if (!inferred) return;

      const hid = ev?.idHomeTeam != null ? String(ev.idHomeTeam) : '';

      if (inferred.venue_key === 'celtic_park') {
        if (!celticId || hid !== celticId) return;
      } else if (inferred.venue_key === 'ibrox') {
        if (!rangersId || hid !== rangersId) return;
      } else if (inferred.venue_key === 'partick_thistle') {
        if (!partickId || hid !== partickId) return;
      }

      const startISO = await resolveKickoffISO(apiKey, ev, lookupCache, warnings, lookupBudget);
      if (!startISO) return;
      if (!isUpcomingOrLive(ev, startISO, nowMs)) return;

      const startMs = Date.parse(startISO);
      if (Number.isFinite(startMs)) {
        if (startMs > nowMs + 400 * 24 * 60 * 60 * 1000) return;
      }

      const row = eventToRow(ev, inferred, startISO);
      if (!row) return;

      const existing = rowByExternalId.get(row.external_id);
      if (!existing) {
        rowByExternalId.set(row.external_id, row);
        return;
      }
      const prev = Date.parse(existing.start_time ?? '');
      const next = Date.parse(row.start_time ?? '');
      if (Number.isFinite(prev) && Number.isFinite(next) && next < prev) {
        rowByExternalId.set(row.external_id, row);
      }
    } catch (e) {
      pushWarning(warnings, `tryAddRow: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // --- Glasgow clubs: each team's "upcoming" list (small payload; home games at our 3 grounds). ---
  const clubSchedules: { id: string | null; label: string }[] = [
    { id: celticId, label: 'Celtic' },
    { id: rangersId, label: 'Rangers' },
    { id: partickId, label: 'Partick Thistle' },
  ];
  for (const { id, label } of clubSchedules) {
    if (Date.now() >= fetchDeadline) {
      stoppedForTimeBudget = true;
      pushWarning(warnings, `Skipped ${label} eventsnext: SPORTSDB_MAX_DURATION_MS exceeded`);
      break;
    }
    if (!id) continue;
    try {
      await pace();
      const events = await fetchNextEvents(apiKey, id, warnings);
      for (const ev of events) {
        await tryAddRow(ev);
      }
    } catch (e) {
      pushWarning(warnings, `${label} eventsnext: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const name of teamNamesNational) {
    if (Date.now() >= fetchDeadline) {
      stoppedForTimeBudget = true;
      pushWarning(warnings, `Skipped national teams fetch: SPORTSDB_MAX_DURATION_MS exceeded`);
      break;
    }
    try {
      await pace();
      const teamId = await searchTeamIdScottish(apiKey, name, warnings);
      if (!teamId) continue;
      await pace();
      const events = await fetchNextEvents(apiKey, teamId, warnings);
      for (const ev of events) {
        await tryAddRow(ev);
      }
    } catch (e) {
      pushWarning(warnings, `National ${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // --- Optional: full league rounds (every match in each round) — only when explicitly enabled. ---
  if (includeLeagueRoundScan()) {
    const roundsWindow = Number(Deno.env.get('SPORTSDB_ROUNDS_WINDOW') ?? '8');
    const windowSize = Number.isFinite(roundsWindow) && roundsWindow >= 4 ? roundsWindow : 8;

    for (const lid of leagueIds) {
      if (Date.now() >= fetchDeadline) {
        stoppedForTimeBudget = true;
        pushWarning(warnings, `Stopped before league ${lid}: SPORTSDB_MAX_DURATION_MS exceeded`);
        break;
      }
      try {
        await pace();
        const seedTeams =
          lid === DEFAULT_CHAMPIONSHIP_LEAGUE_ID ? [partickId] : [celticId, rangersId];

        const startRound = await inferRoundWindowStart(apiKey, lid, seedTeams, warnings);
        const endRound = Math.min(startRound + windowSize - 1, MAX_LEAGUE_ROUND_CAP);

        for (let r = startRound; r <= endRound; r++) {
          if (Date.now() >= fetchDeadline) {
            stoppedForTimeBudget = true;
            pushWarning(warnings, `Stopped league ${lid} at round ${r}: SPORTSDB_MAX_DURATION_MS exceeded`);
            break;
          }
          const evs = await fetchEventsRound(apiKey, lid, r, warnings);
          for (const ev of evs) {
            if (String(ev?.idLeague ?? '') !== String(lid)) continue;
            await tryAddRow(ev);
          }
          if (r < endRound) await pace();
        }
      } catch (e) {
        pushWarning(warnings, `League loop ${lid}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const allRows = [...rowByExternalId.values()];

  if (allRows.length === 0) {
    return {
      ok: true,
      sportsdbEventsUpserted: 0,
      warnings: warnings.length ? warnings : undefined,
      stoppedForTimeBudget: stoppedForTimeBudget || undefined,
      fetchMode,
    };
  }

  try {
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
        home_team: r.home_team,
        away_team: r.away_team,
        url: r.url,
        status: r.status,
        raw_payload: jsonbSafe(r.raw_payload),
        updated_at: r.updated_at,
      })),
      'glasgow_events (sportsdb)'
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      sportsdbEventsUpserted: 0,
      error: `Database upsert failed: ${msg}`,
      warnings: warnings.length ? warnings : undefined,
      stoppedForTimeBudget: stoppedForTimeBudget || undefined,
      fetchMode,
    };
  }

  return {
    ok: true,
    sportsdbEventsUpserted: allRows.length,
    warnings: warnings.length ? warnings : undefined,
    stoppedForTimeBudget: stoppedForTimeBudget || undefined,
    fetchMode,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const result = await run();
    return jsonResponse(result as Record<string, unknown>, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    const safe = message.length > 800 ? `${message.slice(0, 800)}…` : message;
    console.error('sportsdb-events: handler crash', safe, stack ?? '');
    return jsonResponse(
      {
        ok: false,
        sportsdbEventsUpserted: 0,
        error: safe,
        handlerCrash: true,
      },
      200
    );
  }
});
