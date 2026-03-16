# Traffic Scotland receiver — how to run

The receiver fetches DATEX II data from Traffic Scotland and writes it to Supabase `traffic_situations`. It is a Node.js script you can run manually or on a schedule (e.g. cron, GitHub Actions).

**New to this?** Use **`docs/TRAFFIC-SETUP-STEP-BY-STEP.md`** for a full beginner-friendly, click-by-click guide (Supabase, .env file, running the script, and checking the app).

**Quick start (local):**
1. Run the traffic schema in Supabase (see §1).
2. In `scripts/traffic-receiver/` create a `.env` with `TRAFFIC_SCOTLAND_CLIENT_ID`, `TRAFFIC_SCOTLAND_CLIENT_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. From `scripts/traffic-receiver/`: `npm install` then `node index.js`.

---

## 1. Database

Ensure the `traffic_situations` table exists. In the Supabase SQL Editor, run the contents of **`docs/traffic-schema.sql`** (or the traffic section of `docs/supabase-schema.sql`).

## 2. Credentials and secrets

You need four values. **Never commit them to git.**

| Variable | Where to get it |
|----------|------------------|
| `TRAFFIC_SCOTLAND_CLIENT_ID` | Traffic Scotland developer portal → API Credentials |
| `TRAFFIC_SCOTLAND_CLIENT_KEY` | Traffic Scotland developer portal → API Credentials |
| `SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → service_role (secret) |

For **local runs**, create a file `scripts/traffic-receiver/.env` (and add `.env` to `.gitignore` if not already). Example:

```env
TRAFFIC_SCOTLAND_CLIENT_ID=your_client_id
TRAFFIC_SCOTLAND_CLIENT_KEY=your_client_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then load them before running (e.g. `node -r dotenv/config index.js`). Add `dotenv` to the receiver’s package.json if you use this.

For **Supabase Edge Functions** or **hosted cron**, set these as **Supabase secrets** (or your platform’s env vars) and run the same logic there.

## 3. Install and run (local)

From the repo root:

```bash
cd scripts/traffic-receiver
npm install
```

Then either:

- Export the four env vars in your shell and run:
  ```bash
  node index.js
  ```
- Or use a `.env` file and run with dotenv:
  ```bash
  npx dotenv -e .env -- node index.js
  ```
  (Install dotenv: `npm install dotenv` in `scripts/traffic-receiver`.)

## 4. Automatic updates (recommended)

A **GitHub Actions** workflow runs the receiver every 15 minutes so the app always has fresh data.

1. Ensure the repo is on GitHub and contains **`.github/workflows/traffic-receiver.yml`**.
2. In the repo: **Settings** → **Secrets and variables** → **Actions** → add these secrets:
   - `TRAFFIC_SCOTLAND_CLIENT_ID`
   - `TRAFFIC_SCOTLAND_CLIENT_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. The workflow runs on schedule; you can also trigger it from the **Actions** tab → **Traffic receiver** → **Run workflow**.

See **`docs/TRAFFIC-SETUP-STEP-BY-STEP.md`** Part F for full steps.

---

## 5. Schedule (other options)

- **Cron (Linux/macOS):** Add a line to crontab, e.g.:
  ```text
  */10 * * * * cd /path/to/DriverHubApp/scripts/traffic-receiver && /usr/bin/node index.js
  ```
  Ensure the four env vars are set in the cron environment (e.g. in the script or in crontab).

- **GitHub Actions:** Add a workflow that runs on schedule and sets the four secrets as env vars, then runs `cd scripts/traffic-receiver && npm ci && node index.js`.

- **Supabase Edge Function:** Implement the same fetch/parse/upsert logic in a Deno Edge Function and trigger it with a cron (Supabase supports scheduled invocations). Store the four values in Supabase secrets.

## 6. What the script does

1. Fetches `Content.xml` for Unplanned Events, Current Roadworks, Future Roadworks, **Travel Time Data**, **Travel Time Sites**, **Traffic Status Data**, **Traffic Status Sites**, **VMS**, and **VMSTable** from `https://datex2.trafficscotland.org/rest/2.3/` using HTTP Basic auth (Client ID = username, Client Key = password).
2. **Situations:** Parses SOAP-wrapped DATEX II and extracts situations (id, title, description, location, severity, start/end time). Upserts into `traffic_situations` keyed by `(external_id, source_publication)`.
3. **Travel times:** For Travel Time Data (MeasuredDataPublication), extracts site measurements (site_id, measured_at, travel_time_sec, etc.) and upserts into `traffic_travel_times` keyed by `(site_id, measured_at)`.
4. **Travel time sites:** For Travel Time Sites (MeasurementSiteTablePublication), extracts site records (site_id, site_name, direction) and upserts into `traffic_travel_time_sites` keyed by `site_id`. Join with `traffic_travel_times` on `site_id` to show names like “M8 J8 Baillieston to M8 J28 Glasgow Airport”.
5. **Traffic status:** For Traffic Status Data (MeasuredDataPublication with TrafficStatus), extracts site measurements (site_id, measured_at, traffic_status_value: freeFlow, congested, unknown, etc.) and upserts into `traffic_traffic_status` keyed by `(site_id, measured_at)`.
6. **Traffic status sites:** For Traffic Status Sites (MeasurementSiteTablePublication), extracts site records (site_id, site_name, direction) and upserts into `traffic_traffic_status_sites` keyed by `site_id`. Join with `traffic_traffic_status` on `site_id` for readable site names.
7. **VMS:** For VMS (VmsPublication), extracts variable message sign units (vms_id, message_text, time_last_set, vms_working, text_lanterns_on) and upserts into `traffic_vms` keyed by `vms_id`.
8. **VMSTable:** For VMSTable (VmsTablePublication), extracts VMS unit locations (vms_id, location_name, direction, latitude, longitude) and upserts into `traffic_vms_table` keyed by `vms_id`. Join with `traffic_vms` on `vms_id` for message text plus location (e.g. “A9S ½ mile N Broxden Roundabout”).

The app reads from `traffic_situations` via Supabase (anon key, RLS allows authenticated members to SELECT). Use `traffic_travel_times` joined to `traffic_travel_time_sites` for journey-time displays, `traffic_traffic_status` joined to `traffic_traffic_status_sites` for flow status, and `traffic_vms` joined to `traffic_vms_table` for variable message signs with location.
