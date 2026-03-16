import type { SupabaseClient } from "@supabase/supabase-js";
import type { BridgeStatus } from "@/types/bridge";

type Row = {
  id: string;
  name: string;
  status: "open" | "closed" | "unknown";
  current_message: string | null;
  next_closure_start: string | null;
  next_closure_end: string | null;
  next_closure_message: string | null;
  updated_at: string;
};

function rowToBridgeStatus(row: Row): BridgeStatus {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    currentMessage: row.current_message,
    nextClosureStart: row.next_closure_start,
    nextClosureEnd: row.next_closure_end,
    nextClosureMessage: row.next_closure_message,
    updatedAt: row.updated_at,
  };
}

export async function fetchBridgeStatus(
  supabase: SupabaseClient | null,
  id = "renfrew_bridge"
): Promise<{ status: BridgeStatus | null; error: Error | null }> {
  if (!supabase) return { status: null, error: null };

  const { data, error } = await supabase
    .from("bridge_status")
    .select(
      "id, name, status, current_message, next_closure_start, next_closure_end, next_closure_message, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return { status: null, error: (error as unknown as Error) ?? null };
  }

  return { status: rowToBridgeStatus(data as Row), error: null };
}

