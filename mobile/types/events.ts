export type EventSource = 'ticketmaster' | 'sportsdb';
export type EventCategory = 'gig' | 'sport';

export type GlasgowVenueKey =
  | 'ovo_hydro'
  | 'swg3'
  | 'barrowlands'
  | 'o2_academy_glasgow'
  | 'celtic_park'
  | 'ibrox'
  | 'partick_thistle'
  | 'hampden';

export interface GlasgowEventBannerRow {
  venueKey: GlasgowVenueKey;
  venueName: string;
  category: EventCategory;
  source: EventSource;
  externalId: string;
  title: string;
  startTime: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  url: string | null;
  status: string | null;
}

