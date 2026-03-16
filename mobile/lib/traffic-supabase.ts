import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TrafficSituation,
  TrafficTravelTime,
  TrafficStatus,
  TrafficVms,
} from '@/types/traffic';

type Row = {
  id: string;
  external_id: string;
  source_publication: string;
  situation_type: string;
  title: string | null;
  description: string | null;
  location_name: string | null;
  location_direction: string | null;
  severity: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
};

function rowToSituation(row: Row): TrafficSituation {
  return {
    id: row.id,
    externalId: row.external_id,
    sourcePublication: row.source_publication,
    situationType: row.situation_type,
    title: row.title,
    description: row.description,
    locationName: row.location_name,
    locationDirection: row.location_direction,
    severity: row.severity,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all traffic situations, newest first.
 * Returns empty array if Supabase is not configured or on error.
 */
export async function fetchTrafficSituations(
  supabase: SupabaseClient | null
): Promise<{ situations: TrafficSituation[]; error: Error | null }> {
  if (!supabase) {
    return { situations: [], error: null };
  }
  const { data, error } = await supabase
    .from('traffic_situations')
    .select('id, external_id, source_publication, situation_type, title, description, location_name, location_direction, severity, start_time, end_time, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    return { situations: [], error: error as unknown as Error };
  }
  const situations = (data ?? []).map((row) => rowToSituation(row as Row));
  return { situations, error: null };
}

/**
 * Fetch a single situation by id.
 */
export async function fetchTrafficSituationById(
  supabase: SupabaseClient | null,
  id: string
): Promise<{ situation: TrafficSituation | null; error: Error | null }> {
  if (!supabase) {
    return { situation: null, error: null };
  }
  const { data, error } = await supabase
    .from('traffic_situations')
    .select('id, external_id, source_publication, situation_type, title, description, location_name, location_direction, severity, start_time, end_time, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error || !data) {
    return { situation: null, error: (error as unknown as Error) ?? null };
  }
  return { situation: rowToSituation(data as Row), error: null };
}

// --- Journey times (travel times + sites) ---

export async function fetchTrafficTravelTimes(
  supabase: SupabaseClient | null
): Promise<{ data: TrafficTravelTime[]; error: Error | null }> {
  if (!supabase) return { data: [], error: null };
  const [timesRes, sitesRes] = await Promise.all([
    supabase
      .from('traffic_travel_times')
      .select('id, site_id, measured_at, travel_time_sec, free_flow_travel_time_sec, normally_expected_travel_time_sec, free_flow_speed_kmh')
      .order('measured_at', { ascending: false })
      .limit(200),
    supabase.from('traffic_travel_time_sites').select('site_id, site_name, direction'),
  ]);
  if (timesRes.error) return { data: [], error: timesRes.error as unknown as Error };
  const sites = new Map(
    (sitesRes.data ?? []).map((r: { site_id: string; site_name: string | null; direction: string | null }) => [
      r.site_id,
      { siteName: r.site_name, direction: r.direction },
    ])
  );
  const data: TrafficTravelTime[] = (timesRes.data ?? []).map((r: {
    id: string;
    site_id: string;
    measured_at: string;
    travel_time_sec: number | null;
    free_flow_travel_time_sec: number | null;
    normally_expected_travel_time_sec: number | null;
    free_flow_speed_kmh: number | null;
  }) => {
    const s = sites.get(r.site_id);
    return {
      id: r.id,
      siteId: r.site_id,
      siteName: s?.siteName ?? null,
      direction: s?.direction ?? null,
      measuredAt: r.measured_at,
      travelTimeSec: r.travel_time_sec,
      freeFlowTravelTimeSec: r.free_flow_travel_time_sec,
      normallyExpectedTravelTimeSec: r.normally_expected_travel_time_sec,
      freeFlowSpeedKmh: r.free_flow_speed_kmh,
    };
  });
  return { data, error: null };
}

// --- Traffic status (flows + sites) ---

export async function fetchTrafficStatus(
  supabase: SupabaseClient | null
): Promise<{ data: TrafficStatus[]; error: Error | null }> {
  if (!supabase) return { data: [], error: null };
  const [statusRes, sitesRes] = await Promise.all([
    supabase
      .from('traffic_traffic_status')
      .select('id, site_id, measured_at, traffic_status_value')
      .order('measured_at', { ascending: false })
      .limit(200),
    supabase.from('traffic_traffic_status_sites').select('site_id, site_name, direction'),
  ]);
  if (statusRes.error) return { data: [], error: statusRes.error as unknown as Error };
  const sites = new Map(
    (sitesRes.data ?? []).map((r: { site_id: string; site_name: string | null; direction: string | null }) => [
      r.site_id,
      { siteName: r.site_name, direction: r.direction },
    ])
  );
  const data: TrafficStatus[] = (statusRes.data ?? []).map((r: {
    id: string;
    site_id: string;
    measured_at: string;
    traffic_status_value: string | null;
  }) => {
    const s = sites.get(r.site_id);
    return {
      id: r.id,
      siteId: r.site_id,
      siteName: s?.siteName ?? null,
      direction: s?.direction ?? null,
      measuredAt: r.measured_at,
      trafficStatusValue: r.traffic_status_value,
    };
  });
  return { data, error: null };
}

// --- VMS ---

export async function fetchTrafficVms(
  supabase: SupabaseClient | null
): Promise<{ data: TrafficVms[]; error: Error | null }> {
  if (!supabase) return { data: [], error: null };
  const [vmsRes, tableRes] = await Promise.all([
    supabase.from('traffic_vms').select('vms_id, message_text, time_last_set, vms_working'),
    supabase.from('traffic_vms_table').select('vms_id, location_name, direction'),
  ]);
  if (vmsRes.error) return { data: [], error: vmsRes.error as unknown as Error };
  const table = new Map(
    (tableRes.data ?? []).map((r: { vms_id: string; location_name: string | null; direction: string | null }) => [
      r.vms_id,
      { locationName: r.location_name, direction: r.direction },
    ])
  );
  const data: TrafficVms[] = (vmsRes.data ?? []).map((r: {
    vms_id: string;
    message_text: string | null;
    time_last_set: string | null;
    vms_working: boolean | null;
  }) => {
    const t = table.get(r.vms_id);
    return {
      vmsId: r.vms_id,
      messageText: r.message_text,
      timeLastSet: r.time_last_set,
      vmsWorking: r.vms_working,
      locationName: t?.locationName ?? null,
      direction: t?.direction ?? null,
    };
  });
  return { data, error: null };
}
