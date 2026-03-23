# Glasgow Events (TicketMaster + TheSportsDB) — Setup

This covers:
- deploying the two Edge Functions
- setting required secrets
- scheduling them to refresh every 6 hours

## 1) Deploy the Edge Functions

From the repo root:

```bash
supabase functions deploy ticketmaster-events
supabase functions deploy sportsdb-events
```

## 2) Add required secrets (Supabase Dashboard)

In your Supabase project:
1. Go to `Project Settings` -> `Secrets`
2. Add:
   - `TICKETMASTER_API_KEY` (for `ticketmaster-events`)
   - `SPORTSDB_API_KEY` (for `sportsdb-events`)
3. Optional: `SCOTTISH_PREMIERSHIP_LEAGUE_ID` — only if TheSportsDB changes league ids. Default in code is `4330` (Scottish Premier League).
4. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are typically provided automatically by Supabase for Edge Functions. If your project doesn’t, add them too (same names).

Important: never paste keys into GitHub or commit them to the repo.

## 3) Schedule refresh every 6 hours

For each function (`ticketmaster-events` and `sportsdb-events`):
1. Go to `Edge Functions`
2. Select the function
3. Create a new `Schedule`
4. Use cron expression:
   - `0 */6 * * *`
   - (meaning: at minute 0, every 6 hours)

Save.

## 4) Quick sanity check (after schedules run)

In Supabase SQL editor:

```sql
select
  source,
  venue_key,
  title,
  start_time,
  updated_at
from public.glasgow_events
order by start_time asc
limit 50;
```

You should see rows coming in, and the Home banner can query the “next upcoming” events from `start_time`.

