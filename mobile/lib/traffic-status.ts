import type { TrafficSituation } from "@/types/traffic";

export type MotorwayCode = "M8" | "M80" | "M74" | "M73";

export type MotorwayStatus = {
  code: MotorwayCode;
  hasProblems: boolean;
  summary: string;
  count: number;
  plannedSummary: string | null;
};

const MOTORWAYS: MotorwayCode[] = ["M8", "M80", "M74", "M73"];

function isActiveSituation(s: TrafficSituation, now: Date): boolean {
  const startOk =
    !s.startTime || new Date(s.startTime).getTime() <= now.getTime();
  const endOk =
    !s.endTime || new Date(s.endTime).getTime() >= now.getTime();
  return startOk && endOk;
}

function situationMatchesMotorway(
  s: TrafficSituation,
  code: MotorwayCode,
): boolean {
  const title = s.title ?? "";
  // Match the exact motorway code, not prefixes (so M8 doesn't match M80).
  const re = new RegExp(`\\b${code}(?!\\d)`, "i");
  return re.test(title);
}

function severityRank(severity: string | null): number {
  if (!severity) return 0;
  const v = severity.toLowerCase();
  if (v.includes("very") || v.includes("severe")) return 3;
  if (v.includes("high") || v.includes("major")) return 2;
  return 1;
}

function buildSummary(s: TrafficSituation): string {
  const source =
    s.title?.trim() ||
    s.locationName?.trim() ||
    s.description?.trim() ||
    "";
  if (!source) return "Issue detected";

  // Try to lift out a junction reference like \"J24\" if present.
  const jMatch = source.match(/J\\d{1,2}/i);
  if (jMatch) {
    // e.g. \"J24 closed\" or \"Accident J10\"
    const lower = source.toLowerCase();
    if (lower.includes("closed")) {
      return `${jMatch[0].toUpperCase()} closed`;
    }
    if (lower.includes("accident")) {
      return `Accident ${jMatch[0].toUpperCase()}`;
    }
  }

  // Otherwise take a short slice of the source text.
  const trimmed = source.replace(/\\s+/g, " ").trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

export function computeMotorwayStatuses(
  situations: TrafficSituation[],
): MotorwayStatus[] {
  const now = new Date();
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  return MOTORWAYS.map((code) => {
    // Current live issues: unplanned events or current roadworks, not future roadworks.
    const liveIssues = situations.filter((s) => {
      if (s.situationType !== "unplanned_event" && s.situationType !== "current_roadworks") {
        return false;
      }
      if (!s.title) return false;
      if (!situationMatchesMotorway(s, code)) return false;
      if (!isActiveSituation(s, now)) return false;
      const text = (s.title + " " + (s.description ?? "")).toLowerCase();
      // Ignore minor lane closures.
      if (text.includes("lane closure") || text.includes("lane closures")) return false;
      // Anything else that is active and on this motorway counts as a problem.
      return true;
    });

    // Planned closures within next 6 hours (future roadworks).
    const plannedSoon = situations.filter((s) => {
      if (s.situationType !== "future_roadworks") return false;
      if (!s.title) return false;
      if (!situationMatchesMotorway(s, code)) return false;
      if (!s.startTime) return false;
      const start = new Date(s.startTime);
      if (start <= now || start > sixHoursFromNow) return false;
      const text = (s.title + " " + (s.description ?? "")).toLowerCase();
      const hasJunction = /j\d{1,2}/i.test(text);
      const mentionsClosed = text.includes("closed");
      return hasJunction && mentionsClosed;
    });

    const buildPlannedSummary = (): string | null => {
      if (plannedSoon.length === 0) return null;
      const s = plannedSoon[0];
      const src =
        s.title?.trim() ||
        s.locationName?.trim() ||
        s.description?.trim() ||
        "";
      if (!src) return null;
      const jMatch = src.match(/J\d{1,2}/i);
      if (jMatch) {
        return `Planned closure ${jMatch[0].toUpperCase()}`;
      }
      const trimmed = src.replace(/\s+/g, " ").trim();
      return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
    };

    if (liveIssues.length === 0) {
      return {
        code,
        hasProblems: false,
        summary: "ALL OK",
        count: 0,
        plannedSummary: buildPlannedSummary(),
      };
    }

    const sorted = [...liveIssues].sort((a, b) => {
      const sa = severityRank(a.severity);
      const sb = severityRank(b.severity);
      if (sa !== sb) return sb - sa;
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return tb - ta;
    });

    const top = sorted[0];
    return {
      code,
      hasProblems: true,
      summary: buildSummary(top),
      count: liveIssues.length,
      plannedSummary: null,
    };
  });
}

