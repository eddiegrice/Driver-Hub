/**
 * Upsert glasgow_events via PostgREST HTTP — avoids supabase-js edge cases that throw
 * "Cannot read properties of undefined (reading 'error')".
 */

type UpsertRow = Record<string, unknown>;

export function jsonbSafe(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

/**
 * POST with merge-duplicates = upsert on (source, external_id).
 */
export async function upsertGlasgowEventRowsREST(
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
      } catch (secondNet) {
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
