# Renfrew Bridge status (Open/Closed) — setup

This feature adds a **home-screen banner** showing **Renfrew Bridge Status** (OPEN/CLOSED) plus the **next planned closure** when available.

The status is scraped from Renfrewshire Council’s page:

- `https://www.renfrewshire.gov.uk/renfrew-bridge`

## 1) Database

Run the `bridge_status` table SQL in Supabase:

- Either run the full schema in `docs/supabase-schema.sql`
- Or run the traffic add-on schema in `docs/traffic-schema.sql`

The new table is:

- `public.bridge_status`

## 2) Deploy the Supabase Edge Function

The function code is in:

- `supabase/functions/renfrew-bridge-status/index.ts`

You’ll need the Supabase CLI installed and logged in.

### Required secrets (Supabase project)

Set these secrets for the function:

- `BRIDGE_SUPABASE_URL` (your project URL)
- `BRIDGE_SUPABASE_SERVICE_ROLE_KEY` (service role key)

Optional overrides:

- `RENFREW_BRIDGE_URL` (defaults to the council page above)
- `RENFREW_BRIDGE_ID` (defaults to `renfrew_bridge`)
- `RENFREW_BRIDGE_NAME` (defaults to `Renfrew Bridge`)

### Deploy command

From the repo root (example):

```bash
supabase functions deploy renfrew-bridge-status
supabase secrets set BRIDGE_SUPABASE_URL=... BRIDGE_SUPABASE_SERVICE_ROLE_KEY=...
```

### Test it manually

```bash
supabase functions invoke renfrew-bridge-status
```

Then confirm the row exists/updates in Supabase:

```sql
select * from public.bridge_status where id = 'renfrew_bridge';
```

## 3) Schedule it (cron)

Create a cron schedule for the Edge Function (recommended every 5–10 minutes).

Example schedule:
- Every 5 minutes: `*/5 * * * *`

## 4) App configuration

The mobile app reads the status from Supabase, so ensure these are set in the Expo app env:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Notes / reliability

- **Scheduled closures:** Phrases like “will be closed” plus a date and a time range (e.g. `8:15am - 9:15am`) are parsed with **Europe/London** wall time (via Luxon). Until the window starts, the row is stored as **open** with `next_closure_start` / `next_closure_end` set; during the window, **closed**. Text after **Last Updated** is ignored when parsing so the “last updated” timestamp is not mistaken for a closure.
- **Present vs future:** The word “closed” inside **will be closed** does not count as “closed now”. Present closure uses cues like *currently closed*, *closed to traffic*, *bridge closure*, etc.
- The council website may change wording/format. The scraper also stores:
  - `current_message` when the bridge is treated as closed *now*
  - `next_closure_message` for the matched closure snippet when applicable
  - `from … to …` style windows when present in that snippet (UK-style dates)
- The app recomputes OPEN/CLOSED from `next_closure_start` / `next_closure_end` against the device clock so the pill stays correct between scraper runs, and shows a short **warning** before and during a known window.

