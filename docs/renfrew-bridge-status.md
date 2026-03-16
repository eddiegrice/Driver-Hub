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

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional overrides:

- `RENFREW_BRIDGE_URL` (defaults to the council page above)
- `RENFREW_BRIDGE_ID` (defaults to `renfrew_bridge`)
- `RENFREW_BRIDGE_NAME` (defaults to `Renfrew Bridge`)

### Deploy command

From the repo root (example):

```bash
supabase functions deploy renfrew-bridge-status
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
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

- The council website may change wording/format. The scraper is intentionally defensive:
  - It stores the **matched snippet** as `current_message`
  - It stores any “next planned closure” snippet as `next_closure_message`
  - It *attempts* to parse `from ... to ...` into `next_closure_start/end` when dates are in a recognisable UK format.

