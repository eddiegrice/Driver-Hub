import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { DateTime } from "https://esm.sh/luxon@3.5.0";

type BridgeStatus = {
  id: string;
  name: string;
  status: "open" | "closed" | "unknown";
  current_message: string | null;
  next_closure_start: string | null; // timestamptz
  next_closure_end: string | null; // timestamptz
  next_closure_message: string | null;
  source: string;
  updated_at: string;
};

type ClosureWindow = {
  startIso: string;
  endIso: string;
  message: string;
};

const DEFAULT_URL = "https://www.renfrewshire.gov.uk/renfrew-bridge";
const DEFAULT_ID = "renfrew_bridge";
const DEFAULT_NAME = "Renfrew Bridge";
const SOURCE = "renfrewshire_council";
const LONDON = "Europe/London";

function extractNewsflash(html: string): string | null {
  const m = html.match(
    /<div[^>]*class=["'][^"']*newsflash[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  return m ? m[1] : null;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function trimBeforeLastUpdated(text: string): string {
  const i = text.search(/\s+last\s+updated\b/i);
  return (i >= 0 ? text.slice(0, i) : text).trim();
}

function pickSentence(haystack: string, regex: RegExp): string | null {
  const m = haystack.match(regex);
  if (!m) return null;
  const idx = m.index ?? 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(haystack.length, idx + 180);
  return haystack.slice(start, end).trim();
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function toLondonIsoUtc(year: number, month: number, day: number, hour24: number, minute: number): string | null {
  const dt = DateTime.fromObject(
    { year, month, day, hour: hour24, minute, second: 0 },
    { zone: LONDON },
  );
  if (!dt.isValid) return null;
  return dt.toUTC().toISO();
}

/** 1–12 hour clock + am/pm → 24h { hour, minute } */
function wall12To24(hour: number, minute: number, ap: string): { h: number; m: number } | null {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const p = ap.toLowerCase();
  let h = hour;
  if (p === "am") {
    if (h === 12) h = 0;
  } else if (p === "pm") {
    if (h !== 12) h += 12;
  } else return null;
  return { h, m: minute };
}

/**
 * "The bridge will be closed … Friday 20 March 2026 … 8:15am - 9:15am"
 */
function parseWillBeClosedWindows(core: string): ClosureWindow[] {
  const idx = core.search(/\bwill\s+be\s+closed\b/i);
  if (idx < 0) return [];

  const segment = core.slice(idx, idx + 2500);
  const dateRe =
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})|(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;
  const dm = segment.match(dateRe);
  if (!dm) return [];

  const day = Number(dm[1] ?? dm[4]);
  const monName = (dm[2] ?? dm[5]).toLowerCase();
  const year = Number(dm[3] ?? dm[6]);
  const month = MONTHS[monName];
  if (!day || !month || !year) return [];

  const timeRe =
    /(\d{1,2})[.:](\d{2})\s*(am|pm)\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*(am|pm)/i;
  const tm = segment.match(timeRe);
  if (!tm) return [];

  const start = wall12To24(Number(tm[1]), Number(tm[2]), tm[3]);
  const end = wall12To24(Number(tm[4]), Number(tm[5]), tm[6]);
  if (!start || !end) return [];

  const startIso = toLondonIsoUtc(year, month, day, start.h, start.m);
  const endIso = toLondonIsoUtc(year, month, day, end.h, end.m);
  if (!startIso || !endIso) return [];

  const message = segment.slice(0, Math.min(segment.length, 380)).replace(/\s+/g, " ").trim();
  return [{ startIso, endIso, message }];
}

function parseNextClosureRangeLuxon(next: string | null): { start: string | null; end: string | null } {
  if (!next) return { start: null, end: null };
  const s = next.replace(/\s+/g, " ").trim();
  const re =
    /\bfrom\s+(.{6,80}?)\s+\b(to|until|till)\b\s+(.{6,80}?)(?:\.|$)/i;
  const m = s.match(re);
  if (!m) return { start: null, end: null };

  const formats = [
    "d/M/yyyy HH:mm",
    "d/M/yyyy H:mm",
    "d/M/yyyy",
    "d MMMM yyyy HH:mm",
    "d MMMM yyyy H:mm",
    "d MMMM yyyy h:mm a",
    "d MMMM yyyy h:mma",
    "d MMMM yyyy",
  ];

  const parseChunk = (raw: string): DateTime | null => {
    const t = raw.trim().replace(/(\.|,)+$/g, "");
    for (const f of formats) {
      const dt = DateTime.fromFormat(t, f, { zone: LONDON, locale: "en-GB" });
      if (dt.isValid) return dt;
    }
    const isoTry = DateTime.fromISO(t, { zone: LONDON });
    return isoTry.isValid ? isoTry : null;
  };

  const a = parseChunk(m[1]);
  const b = parseChunk(m[3]);
  return {
    start: a?.toUTC().toISO() ?? null,
    end: b?.toUTC().toISO() ?? null,
  };
}

function mergeWindows(windows: ClosureWindow[]): ClosureWindow[] {
  const seen = new Set<string>();
  const out: ClosureWindow[] = [];
  for (const w of windows) {
    const k = `${w.startIso}|${w.endIso}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  out.sort((x, y) => Date.parse(x.startIso) - Date.parse(y.startIso));
  return out;
}

/** True if "closed" at this index is part of a future-tense phrase (e.g. "will be closed"). */
function isFutureTenseClosed(text: string, closedMatchIndex: number): boolean {
  const before = text.slice(Math.max(0, closedMatchIndex - 50), closedMatchIndex);
  return /(?:^|\s)(?:will|going)\s+to\s+be\s+$/i.test(before) ||
    /(?:^|\s)scheduled\s+to\s+be\s+$/i.test(before) ||
    /(?:^|\s)will\s+be\s+$/i.test(before);
}

/**
 * Treat as currently closed only when wording indicates present closure, not a future announcement.
 */
function findPresentClosedCue(text: string): string | null {
  const patterns: RegExp[] = [
    /\bcurrently\s+closed\b/gi,
    /\bclosed\s+to\s+(?:both\s+)?(?:road|pedestrian|vehicles|traffic|all\s+traffic)\b/gi,
    /\bbridge\s+closure\b/gi,
    /\bis\s+now\s+closed\b/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const inner = /\bclosed\b/i.exec(m[0]);
      const closedIdx = inner ? m.index + (inner.index ?? 0) : m.index;
      if (!isFutureTenseClosed(text, closedIdx)) {
        const start = Math.max(0, m.index - 60);
        const end = Math.min(text.length, m.index + 140);
        return text.slice(start, end).trim();
      }
    }
  }

  let m: RegExpExecArray | null;
  const bare = /\bclosed\b/gi;
  while ((m = bare.exec(text)) !== null) {
    if (!isFutureTenseClosed(text, m.index)) {
      const start = Math.max(0, m.index - 60);
      const end = Math.min(text.length, m.index + 120);
      return text.slice(start, end).trim();
    }
  }
  return null;
}

function findOpenCue(text: string): string | null {
  const openRe =
    /\b(currently\s+)?open\b|\bopen\s+as\s+normal\b|\bopen\s+to\s+(?:both\s+)?(?:road|pedestrian|vehicles|traffic|all\s+traffic)\b/gi;
  return pickSentence(text, openRe);
}

function parseStatus(
  text: string,
  now: Date,
): {
  status: BridgeStatus["status"];
  current: string | null;
  next: string | null;
  start: string | null;
  end: string | null;
} {
  const core = trimBeforeLastUpdated(text);
  const nowMs = now.getTime();

  const noClosuresRe = /\bno\s+closures?\s+currently\s+planned\b/i;
  const noClosures = pickSentence(core, noClosuresRe);
  if (noClosures) {
    return { status: "open", current: noClosures, next: null, start: null, end: null };
  }

  let windows = mergeWindows([...parseWillBeClosedWindows(core)]);

  const nextRe =
    /\bnext\s+planned\s+closure\b[\s\S]{0,220}|\bplanned\s+closure\b[\s\S]{0,220}|\bwill\s+be\s+closed\b[\s\S]{0,220}/i;
  const nextSentence = pickSentence(core, nextRe);
  const fromTo = parseNextClosureRangeLuxon(nextSentence);
  if (fromTo.start && fromTo.end) {
    windows = mergeWindows([
      ...windows,
      {
        startIso: fromTo.start,
        endIso: fromTo.end,
        message: nextSentence ?? "",
      },
    ]);
  }

  if (windows.length > 0) {
    for (const w of windows) {
      const startMs = Date.parse(w.startIso);
      const endMs = Date.parse(w.endIso);
      if (nowMs >= startMs && nowMs <= endMs) {
        return {
          status: "closed",
          current: w.message,
          next: w.message,
          start: w.startIso,
          end: w.endIso,
        };
      }
    }

    const upcoming = windows.find((w) => nowMs < Date.parse(w.startIso));
    if (upcoming) {
      return {
        status: "open",
        current: null,
        next: upcoming.message,
        start: upcoming.startIso,
        end: upcoming.endIso,
      };
    }

    const last = windows[windows.length - 1];
    const endMs = Date.parse(last.endIso);
    if (nowMs > endMs) {
      return {
        status: "open",
        current: null,
        next: null,
        start: null,
        end: null,
      };
    }
  }

  const closed = findPresentClosedCue(core);
  if (closed) {
    return { status: "closed", current: closed, next: nextSentence, start: null, end: null };
  }

  const open = findOpenCue(core);
  if (open) {
    return { status: "open", current: open, next: nextSentence, start: null, end: null };
  }

  return { status: "unknown", current: null, next: nextSentence, start: null, end: null };
}

async function fetchCouncilPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-GB,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`Council page HTTP ${res.status}`);
  return await res.text();
}

serve(async (req) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const supabaseUrl = Deno.env.get("BRIDGE_SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("BRIDGE_SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        "Missing BRIDGE_SUPABASE_URL or BRIDGE_SUPABASE_SERVICE_ROLE_KEY",
        { status: 500 },
      );
    }

    const url = Deno.env.get("RENFREW_BRIDGE_URL") ?? DEFAULT_URL;
    const id = Deno.env.get("RENFREW_BRIDGE_ID") ?? DEFAULT_ID;
    const name = Deno.env.get("RENFREW_BRIDGE_NAME") ?? DEFAULT_NAME;

    const html = await fetchCouncilPage(url);
    const newsflashHtml = extractNewsflash(html);
    const text = stripHtmlToText(newsflashHtml ?? html);
    const now = new Date();
    const { status, current, next, start, end } = parseStatus(text, now);

    const nowIso = now.toISOString();
    const row: Partial<BridgeStatus> = {
      id,
      name,
      status,
      current_message: current,
      next_closure_message: next,
      next_closure_start: start,
      next_closure_end: end,
      source: SOURCE,
      updated_at: nowIso,
    };

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("bridge_status").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

    return Response.json({ ok: true, status, updated_at: nowIso });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
});
