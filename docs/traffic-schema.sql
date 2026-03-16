-- Traffic Alerts: run this in Supabase SQL Editor if you added traffic after the main schema.
-- See docs/traffic-alerts-plan.md and docs/traffic-receiver.md.

create table if not exists public.traffic_situations (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source_publication text not null,
  situation_type text not null,
  title text,
  description text,
  location_name text,
  location_direction text,
  severity text,
  start_time timestamptz,
  end_time timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_id, source_publication)
);

create index if not exists idx_traffic_situations_type on public.traffic_situations(situation_type);
create index if not exists idx_traffic_situations_times on public.traffic_situations(start_time, end_time);
create index if not exists idx_traffic_situations_updated on public.traffic_situations(updated_at desc);

alter table public.traffic_situations enable row level security;

drop policy if exists "Members can read traffic situations" on public.traffic_situations;
create policy "Members can read traffic situations"
  on public.traffic_situations for select
  using (auth.role() = 'authenticated');

-- Travel time measurements (from MeasuredDataPublication / TravelTimeData).
-- Site names/locations come from TravelTimeSites (MeasurementSiteTable); can be joined later.
create table if not exists public.traffic_travel_times (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  measured_at timestamptz not null,
  travel_time_sec int,
  free_flow_travel_time_sec int,
  normally_expected_travel_time_sec int,
  free_flow_speed_kmh int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, measured_at)
);

create index if not exists idx_traffic_travel_times_site on public.traffic_travel_times(site_id);
create index if not exists idx_traffic_travel_times_measured_at on public.traffic_travel_times(measured_at desc);

alter table public.traffic_travel_times enable row level security;

drop policy if exists "Members can read traffic travel times" on public.traffic_travel_times;
create policy "Members can read traffic travel times"
  on public.traffic_travel_times for select
  using (auth.role() = 'authenticated');

-- Travel time site names/locations (from MeasurementSiteTablePublication / TravelTimeSites).
-- Join to traffic_travel_times on site_id to show e.g. "M8 J8 Baillieston to M8 J28 Glasgow Airport".
create table if not exists public.traffic_travel_time_sites (
  site_id text primary key,
  site_name text,
  direction text,
  updated_at timestamptz not null default now()
);

alter table public.traffic_travel_time_sites enable row level security;

drop policy if exists "Members can read traffic travel time sites" on public.traffic_travel_time_sites;
create policy "Members can read traffic travel time sites"
  on public.traffic_travel_time_sites for select
  using (auth.role() = 'authenticated');

-- Traffic status site names (from MeasurementSiteTablePublication / TrafficStatusSites).
-- Join to traffic_traffic_status on site_id to show names like "A720 A772 - A7_E".
create table if not exists public.traffic_traffic_status_sites (
  site_id text primary key,
  site_name text,
  direction text,
  updated_at timestamptz not null default now()
);

alter table public.traffic_traffic_status_sites enable row level security;

drop policy if exists "Members can read traffic traffic status sites" on public.traffic_traffic_status_sites;
create policy "Members can read traffic traffic status sites"
  on public.traffic_traffic_status_sites for select
  using (auth.role() = 'authenticated');

-- Traffic status per site (from MeasuredDataPublication / TrafficStatusData).
-- basicData xsi:type="TrafficStatus" → trafficStatusValue: freeFlow, congested, unknown, etc.
-- Join to traffic_traffic_status_sites for site names.
create table if not exists public.traffic_traffic_status (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  measured_at timestamptz not null,
  traffic_status_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, measured_at)
);

create index if not exists idx_traffic_traffic_status_site on public.traffic_traffic_status(site_id);
create index if not exists idx_traffic_traffic_status_measured_at on public.traffic_traffic_status(measured_at desc);
create index if not exists idx_traffic_traffic_status_value on public.traffic_traffic_status(traffic_status_value);

alter table public.traffic_traffic_status enable row level security;

drop policy if exists "Members can read traffic traffic status" on public.traffic_traffic_status;
create policy "Members can read traffic traffic status"
  on public.traffic_traffic_status for select
  using (auth.role() = 'authenticated');

-- Variable message signs (from VmsPublication / VMS).
-- vmsUnit[]: vmsUnitReference id, vms.vmsWorking, vmsMessage.timeLastSet, text from vmsTextLine.
create table if not exists public.traffic_vms (
  vms_id text primary key,
  message_text text,
  time_last_set timestamptz,
  vms_working boolean,
  text_lanterns_on boolean,
  updated_at timestamptz not null default now()
);

create index if not exists idx_traffic_vms_time_last_set on public.traffic_vms(time_last_set desc);

alter table public.traffic_vms enable row level security;

drop policy if exists "Members can read traffic vms" on public.traffic_vms;
create policy "Members can read traffic vms"
  on public.traffic_vms for select
  using (auth.role() = 'authenticated');

-- VMS unit locations (from VmsTablePublication / VMSTable).
-- Join to traffic_vms on vms_id to show location names e.g. "A9S ½ mile N Broxden Roundabout".
create table if not exists public.traffic_vms_table (
  vms_id text primary key,
  location_name text,
  direction text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz not null default now()
);

create index if not exists idx_traffic_vms_table_direction on public.traffic_vms_table(direction);

alter table public.traffic_vms_table enable row level security;

drop policy if exists "Members can read traffic vms table" on public.traffic_vms_table;
create policy "Members can read traffic vms table"
  on public.traffic_vms_table for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Renfrew Bridge status (scraped from Renfrewshire Council website)
-- ---------------------------------------------------------------------------
create table if not exists public.bridge_status (
  id text primary key,
  name text not null,
  status text not null check (status in ('open', 'closed', 'unknown')),
  current_message text,
  next_closure_start timestamptz,
  next_closure_end timestamptz,
  next_closure_message text,
  source text not null default 'renfrewshire_council',
  updated_at timestamptz not null default now()
);

create index if not exists idx_bridge_status_updated_at on public.bridge_status(updated_at desc);

alter table public.bridge_status enable row level security;

drop policy if exists "Members can read bridge status" on public.bridge_status;
create policy "Members can read bridge status"
  on public.bridge_status for select
  using (auth.role() = 'authenticated');
