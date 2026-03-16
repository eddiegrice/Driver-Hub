/**
 * Traffic situations from Traffic Scotland DATEX II (stored in Supabase traffic_situations).
 */
export interface TrafficSituation {
  id: string;
  externalId: string;
  sourcePublication: string;
  situationType: string;
  title: string | null;
  description: string | null;
  locationName: string | null;
  locationDirection: string | null;
  severity: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Human-readable label for situation type */
export function situationTypeLabel(type: string): string {
  switch (type) {
    case 'unplanned_event':
      return 'Incident';
    case 'current_roadworks':
      return 'Roadworks';
    case 'future_roadworks':
      return 'Planned roadworks';
    default:
      return type.replace(/_/g, ' ');
  }
}

/** Journey time row with optional site name (from traffic_travel_times + traffic_travel_time_sites). */
export interface TrafficTravelTime {
  id: string;
  siteId: string;
  siteName: string | null;
  direction: string | null;
  measuredAt: string;
  travelTimeSec: number | null;
  freeFlowTravelTimeSec: number | null;
  normallyExpectedTravelTimeSec: number | null;
  freeFlowSpeedKmh: number | null;
}

/** Traffic flow/status row with optional site name (from traffic_traffic_status + traffic_traffic_status_sites). */
export interface TrafficStatus {
  id: string;
  siteId: string;
  siteName: string | null;
  direction: string | null;
  measuredAt: string;
  trafficStatusValue: string | null;
}

/** Variable message sign (from traffic_vms + traffic_vms_table). */
export interface TrafficVms {
  vmsId: string;
  messageText: string | null;
  timeLastSet: string | null;
  vmsWorking: boolean | null;
  locationName: string | null;
  direction: string | null;
}
