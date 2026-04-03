/**
 * Casework push notifications — called by Supabase Database Webhooks.
 * Secrets: CASEWORK_PUSH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: EXPO_ACCESS_TOKEN (Expo account token for higher limits)
 *
 * Webhook must send header: x-casework-secret: <same as CASEWORK_PUSH_SECRET>
 * Deploy with: supabase functions deploy casework-push --no-verify-jwt
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type WebhookBody = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    case_open: "Case Open",
    investigating: "Investigating",
    actioning: "Actioning",
    closed_no_resolution: "Closed - No Resolution",
    closed_resolved: "Closed - Resolved",
  };
  return map[status] ?? status;
}

async function fetchIsAdmin(
  supabase: ReturnType<typeof createClient>,
  memberId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("members")
    .select("is_admin")
    .eq("id", memberId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

/** All push_token values for these member UUIDs (deduped). */
async function fetchPushTokensForMembers(
  supabase: ReturnType<typeof createClient>,
  memberIds: string[]
): Promise<string[]> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from("member_devices")
    .select("push_token")
    .in("member_id", unique);
  if (error) {
    console.error("member_devices select error", error);
    return [];
  }
  const tokens = (data ?? [])
    .map((r: { push_token: string }) => r.push_token)
    .filter(Boolean);
  return [...new Set(tokens)];
}

/** Member IDs where is_admin = true */
async function fetchAdminMemberIds(
  supabase: ReturnType<typeof createClient>
): Promise<string[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("is_admin", true);
  if (error) {
    console.error("admin members select error", error);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

async function sendExpoBatch(
  items: { to: string; title: string; body: string; data?: Record<string, string> }[]
): Promise<void> {
  if (items.length === 0) return;
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const max = 100;
  for (let i = 0; i < items.length; i += max) {
    const chunk = items.slice(i, i + max);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(chunk),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Expo push HTTP error", res.status, text);
    } else {
      try {
        const j = JSON.parse(text) as { data?: { status?: string; message?: string }[] };
        for (const row of j.data ?? []) {
          if (row?.status === "error") {
            console.error("Expo ticket error", row.message);
          }
        }
      } catch {
        /* non-JSON response */
      }
    }
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("CASEWORK_PUSH_SECRET");
  const hdr = req.headers.get("x-casework-secret");
  if (!secret || hdr !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Some webhook configs wrap the event in { payload: { ... } }
  const body = (
    typeof raw === "object" &&
    raw !== null &&
    "payload" in raw &&
    typeof (raw as { payload: unknown }).payload === "object"
      ? (raw as { payload: WebhookBody }).payload
      : raw
  ) as WebhookBody;

  const eventType = body.type ?? "";
  const table = body.table ?? "";
  const record = body.record ?? {};
  const oldRecord = body.old_record ?? null;

  const notifications: {
    to: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }[] = [];

  try {
    // ----- New row in casework_messages -----
    if (table === "casework_messages" && eventType === "INSERT") {
      const caseId = record.case_id as string;
      const authorId = record.author_member_id as string;
      if (!caseId || !authorId) {
        return new Response(JSON.stringify({ ok: true, note: "skip: missing ids" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: caseRow } = await supabase
        .from("casework_cases")
        .select("member_id, subject")
        .eq("id", caseId)
        .maybeSingle();

      const memberId = caseRow?.member_id as string | null;
      const subject = (caseRow?.subject as string) || "Casework";

      const authorIsAdmin = await fetchIsAdmin(supabase, authorId);

      if (authorIsAdmin) {
        // Staff replied → notify the member who owns the case (if any)
        if (memberId && memberId !== authorId) {
          const tokens = await fetchPushTokensForMembers(supabase, [memberId]);
          for (const to of tokens) {
            notifications.push({
              to,
              title: "Casework update",
              body: `The club replied on: ${subject.slice(0, 80)}${subject.length > 80 ? "…" : ""}`,
              data: { caseId, type: "casework_message" },
            });
          }
        } else if (!memberId) {
          // Internal case: notify other admins
          const adminIds = await fetchAdminMemberIds(supabase);
          const others = adminIds.filter((id) => id !== authorId);
          const tokens = await fetchPushTokensForMembers(supabase, others);
          for (const to of tokens) {
            notifications.push({
              to,
              title: "Internal casework",
              body: `New note on internal case: ${subject.slice(0, 60)}`,
              data: { caseId, type: "casework_internal_message" },
            });
          }
        }
      } else {
        // Member posted → notify admins (optionally exclude author if they are admin too)
        const adminIds = await fetchAdminMemberIds(supabase);
        const targets = adminIds.filter((id) => id !== authorId);
        const tokens = await fetchPushTokensForMembers(supabase, targets);
        for (const to of tokens) {
          notifications.push({
            to,
            title: "New casework message",
            body: `Member message on: ${subject.slice(0, 60)}${subject.length > 60 ? "…" : ""}`,
            data: { caseId, type: "casework_member_message" },
          });
        }
      }
    }

    // ----- New row in casework_cases -----
    if (table === "casework_cases" && eventType === "INSERT") {
      const memberId = record.member_id as string | null;
      const openedByAdmin = Boolean(record.opened_by_admin);
      const createdBy = record.created_by_id as string;
      const subject = (record.subject as string) || "Casework";

      if (openedByAdmin && memberId) {
        const tokens = await fetchPushTokensForMembers(supabase, [memberId]);
        for (const to of tokens) {
          notifications.push({
            to,
            title: "New casework case",
            body: "The club opened a casework case for you. Open the app to view it.",
            data: { caseId: record.id as string, type: "casework_opened_for_you" },
          });
        }
      } else if (!openedByAdmin && memberId) {
        const adminIds = await fetchAdminMemberIds(supabase);
        const targets = adminIds.filter((id) => id !== createdBy);
        const tokens = await fetchPushTokensForMembers(supabase, targets);
        for (const to of tokens) {
          notifications.push({
            to,
            title: "New casework request",
            body: `New case: ${subject.slice(0, 70)}${subject.length > 70 ? "…" : ""}`,
            data: { caseId: record.id as string, type: "casework_new_request" },
          });
        }
      } else if (!memberId) {
        // Internal case created
        const adminIds = await fetchAdminMemberIds(supabase);
        const targets = adminIds.filter((id) => id !== createdBy);
        const tokens = await fetchPushTokensForMembers(supabase, targets);
        for (const to of tokens) {
          notifications.push({
            to,
            title: "Internal casework",
            body: `New internal case: ${subject.slice(0, 60)}`,
            data: { caseId: record.id as string, type: "casework_internal_new" },
          });
        }
      }
    }

    // ----- Updated casework_cases (status change) -----
    if (table === "casework_cases" && eventType === "UPDATE") {
      const memberId = record.member_id as string | null;
      const newStatus = record.status as string;
      const oldStatus = oldRecord?.status as string | undefined;
      if (memberId && oldStatus !== undefined && newStatus !== oldStatus) {
        const tokens = await fetchPushTokensForMembers(supabase, [memberId]);
        for (const to of tokens) {
          notifications.push({
            to,
            title: "Casework status updated",
            body: `Your case is now: ${statusLabel(newStatus)}`,
            data: { caseId: record.id as string, type: "casework_status", status: newStatus },
          });
        }
      }
    }

    await sendExpoBatch(notifications);

    return new Response(
      JSON.stringify({
        ok: true,
        table,
        eventType,
        notificationCount: notifications.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("casework-push error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
