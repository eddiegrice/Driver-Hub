import type { BridgeStatus } from "@/types/bridge";

export type BridgeBannerWarning =
  | { kind: "planned"; line1Rest: string }
  | { kind: "in_progress"; text: string };

export type BridgeBannerDisplay = {
  pillKind: "open" | "closed" | "unknown";
  pillLabel: string;
  warning: BridgeBannerWarning | null;
};

const LONDON_TZ = "Europe/London";

function hmLondon(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Text after "CLOSURE ALERT: " on line 1 — e.g. "Fri 20 Mar, 08:15 - 09:15" */
function formatPlannedClosureLine1Rest(startMs: number, endMs: number): string {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(startMs);
  return `${datePart}, ${hmLondon(startMs)} - ${hmLondon(endMs)}`;
}

/**
 * When next_closure_start/end are set, they define open vs closed for that window regardless
 * of stale status flags. Otherwise uses bridge.status from the scraper.
 */
export function getBridgeBannerDisplay(
  bridge: BridgeStatus | null,
  hasError: boolean,
  nowMs: number = Date.now()
): BridgeBannerDisplay {
  if (!bridge || hasError) {
    return { pillKind: "unknown", pillLabel: "Status unavailable", warning: null };
  }

  const startMs = bridge.nextClosureStart ? Date.parse(bridge.nextClosureStart) : NaN;
  const endMs = bridge.nextClosureEnd ? Date.parse(bridge.nextClosureEnd) : NaN;
  const haveWindow = Number.isFinite(startMs) && Number.isFinite(endMs);

  let pillKind: "open" | "closed" | "unknown";
  let warning: BridgeBannerWarning | null = null;

  if (haveWindow) {
    if (nowMs >= startMs && nowMs <= endMs) {
      pillKind = "closed";
      const until = new Date(endMs).toLocaleTimeString("en-GB", {
        timeZone: LONDON_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      warning = { kind: "in_progress", text: `Closure in progress until ${until}` };
    } else if (nowMs < startMs) {
      pillKind = "open";
      warning = {
        kind: "planned",
        line1Rest: formatPlannedClosureLine1Rest(startMs, endMs),
      };
    } else {
      pillKind = "open";
      warning = null;
    }
  } else if (bridge.status === "open") {
    pillKind = "open";
  } else if (bridge.status === "closed") {
    pillKind = "closed";
  } else {
    pillKind = "unknown";
  }

  const pillLabel =
    pillKind === "open" ? "OPEN" : pillKind === "closed" ? "CLOSED" : "Status unavailable";
  return { pillKind, pillLabel, warning };
}
