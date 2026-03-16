import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

const DEFAULT_URL = "https://www.renfrewshire.gov.uk/renfrew-bridge";
const DEFAULT_ID = "renfrew_bridge";
const DEFAULT_NAME = "Renfrew Bridge";
const SOURCE = "renfrewshire_council";

function extractNewsflash(html: string): string | null {
  const m = html.match(
    /<div[^>]*class=["'][^"']*newsflash[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  return m ? m[1] : null;
}

function stripHtmlToText(html: string): string {
  // Cheap + robust text extraction (avoid DOM libs in Edge runtime).
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

function pickSentence(haystack: string, regex: RegExp): string | null {
  const m = haystack.match(regex);
  if (!m) return null;
  // Grab some context around match to act as a readable “reason”.
  const idx = m.index ?? 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(haystack.length, idx + 180);
  return haystack.slice(start, end).trim();
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
  const lower = text.toLowerCase();
  const nowMs = now.getTime();

  // Explicit \"no closures planned\" cue – treat as OPEN.
  const noClosuresRe = /\bno\s+closures?\s+currently\s+planned\b/i;
  const noClosures = pickSentence(text, noClosuresRe);
  if (noClosures) {
    return { status: "open", current: noClosures, next: null, start: null, end: null };
  }

  // Current status cues (more conservative; we store matched context for debugging).
  const closedRe = /\b(currently\s+)?closed\b|\bclosed\s+to\s+(vehicles|traffic|all traffic)\b|\bbridge\s+closure\b/gi;
  const openRe = /\b(currently\s+)?open\b|\bopen\s+as\s+normal\b|\bopen\s+to\s+(vehicles|traffic|all traffic)\b/gi;

  // “Next planned closure” cues: e.g. “will be closed from <date> to <date>”.
  const nextRe = /\bnext\s+planned\s+closure\b[\s\S]{0,220}|\bplanned\s+closure\b[\s\S]{0,220}|\bwill\s+be\s+closed\b[\s\S]{0,220}/i;

  const next = pickSentence(text, nextRe);
  const range = parseNextClosureRange(next);

  let status: BridgeStatus["status"] = "unknown";
  let current: string | null = null;

  // If we have a closure window, decide if it is future-only or currently active.
  if (next && (range.start || range.end)) {
    const startMs = range.start ? Date.parse(range.start) : null;
    const endMs = range.end ? Date.parse(range.end) : null;
    const within =
      startMs !== null && endMs !== null &&
      Number.isFinite(startMs) && Number.isFinite(endMs) &&
      nowMs >= startMs && nowMs <= endMs;

    if (within) {
      status = "closed";
      current = next;
    } else {
      // Future (or past) closure window → keep bridge open for now, but expose next_closure_*.
      status = "open";
      current = null;
    }
  }

  // If we still don't have an explicit status, fall back to generic cues.
  if (status === "unknown") {
    const closed = pickSentence(text, closedRe);
    if (closed) {
      status = "closed";
      current = closed;
    } else {
      const open = pickSentence(text, openRe);
      if (open) {
        status = "open";
        current = open;
      }
    }
  }

  return { status, current, next, start: range.start, end: range.end };
}

function parseUkDateTime(input: string): Date | null {
  const s = input.trim().replace(/(\.|,)+$/g, "");
  // Support:
  // - "15/03/2026 10:30"
  // - "15 March 2026 10:30"
  // - "15 March 2026" (assume 00:00)
  const m1 = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/i,
  );
  if (m1) {
    const dd = Number(m1[1]);
    const mm = Number(m1[2]);
    const yyyy = Number(m1[3]);
    const hh = m1[4] ? Number(m1[4]) : 0;
    const mi = m1[5] ? Number(m1[5]) : 0;
    if (!dd || !mm || !yyyy) return null;
    return new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi, 0));
  }

  const monthMap: Record<string, number> = {
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
  const m2 = s.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/i,
  );
  if (m2) {
    const dd = Number(m2[1]);
    const mon = monthMap[m2[2].toLowerCase()];
    const yyyy = Number(m2[3]);
    const hh = m2[4] ? Number(m2[4]) : 0;
    const mi = m2[5] ? Number(m2[5]) : 0;
    if (!dd || !mon || !yyyy) return null;
    return new Date(Date.UTC(yyyy, mon - 1, dd, hh, mi, 0));
  }

  return null;
}

function parseNextClosureRange(next: string | null): { start: string | null; end: string | null } {
  if (!next) return { start: null, end: null };
  const s = next.replace(/\s+/g, " ").trim();

  // Try "from <date/time> to <date/time>"
  const re =
    /\bfrom\s+(.{6,60}?)\s+\b(to|until|till)\b\s+(.{6,60}?)(?:\.|$)/i;
  const m = s.match(re);
  if (!m) return { start: null, end: null };

  const startRaw = m[1].trim();
  const endRaw = m[3].trim();

  // If end omits year/date, parsing might fail; we still keep message-only.
  const start = parseUkDateTime(startRaw);
  const end = parseUkDateTime(endRaw);
  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
  };
}

async function fetchCouncilPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Some council sites block default runtimes; use a common browser UA.
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

    // Supabase_*-prefixed env vars are reserved; use custom names for this function.
    const supabaseUrl = Deno.env.get("BRIDGE_SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("BRIDGE_SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
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
