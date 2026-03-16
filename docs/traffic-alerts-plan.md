# Traffic Alerts — Plan & Step-by-Step Guide

**Goal:** PHD Matrix gets traffic data from Traffic Scotland (DATEX II), stores it, and shows it in the Traffic Alerts tab in a clear, useful way. Design must match the app’s existing Neo-Gradients glassmorphism theme. Push notifications can be added later.

**Audience:** Written for a non-technical product owner; detailed enough for an AI agent or developer to implement.

---

## 1. What is DATEX II and Traffic Scotland?

### DATEX II (in simple terms)

- **DATEX II** is a **European standard** for exchanging traffic and travel information.
- Data is usually in **XML** (sometimes JSON): structured “publications” that describe events (roadworks, incidents, journey times, etc.).
- It’s used by many road authorities so that different systems can all speak the same “language.”

### Traffic Scotland

- **Traffic Scotland** runs Scotland’s trunk road network and provides a **developer hub** with a **DATEX II feed**.
- You need a **developer account** and approval to access the feed.
- The feed typically includes:
  - **Journey times**
  - **VMS messages** (variable message signs)
  - **Traffic status**
  - **Future roadworks**
  - **Roadworks** (current)
  - **Unplanned events** (incidents, accidents, etc.)

We don’t know the **exact** fields and structure until we have access; the first phase is to **explore the feed** and decide what to store and show.

---

## 2. How does “receiving” DATEX II work?

- Traffic Scotland can deliver data in different ways. The most common for third-party apps is **Client Pull**: **our system** periodically **requests** a snapshot of data (e.g. over HTTP); they respond with a DATEX II document (XML or JSON).
- A **DATEX II receiver** is simply: **something that runs on a schedule**, calls Traffic Scotland’s URL (with your credentials), downloads the response, **parses** the DATEX II, and **writes** the useful bits into **our database**. The app does **not** talk to Traffic Scotland directly; it only reads from our database.

So:

1. **Receiver** (our backend) → pulls from Traffic Scotland → parses DATEX II → writes to **our DB**.
2. **App** → reads from **our DB** (e.g. Supabase) → shows alerts in the Traffic Alerts tab.

---

## 3. What we need to build (high level)

| Piece | What it does |
|-------|------------------|
| **1. Your credentials & feed URL** | From Traffic Scotland developer portal (see steps below). |
| **2. DATEX II receiver** | A small service or Supabase Edge Function that runs on a schedule, fetches the feed, parses it, and upserts into our database. |
| **3. Database tables** | Tables in Supabase to store “traffic situations” (e.g. roadworks, unplanned events, maybe journey times) in a simple, app-friendly shape. |
| **4. App: Traffic Alerts tab** | Reads from Supabase, displays alerts in a list/detail layout using GlassCard / smoked glass, consistent with the rest of the app. |
| **5. (Later) Push notifications** | Use the same data to send “alert” pushes for important events. |

---

## 4. What you need to do first (step-by-step)

These steps are for **you** (the product owner) to get the data source ready. Do them before we implement the receiver.

### Step 1: Log in to Traffic Scotland Developer Portal

- Go to: **https://developer.trafficscotland.org/**
- Log in with your developer account.

### Step 2: Find DATEX II access and documentation

- In the portal, look for **DATEX II** or **“Data feeds”** / **“API”**.
- You need:
  - **Feed URL(s)** – e.g. `https://...` that we will call to get the data.
  - **Authentication** – e.g. API key, username/password, or token. (Often they give an API key or require it in a header.)
  - **Terms / usage limits** – e.g. how often we are allowed to poll (e.g. every 5–15 minutes is common).

If the portal doesn’t show the exact URL or auth method, use their contact (e.g. **info@trafficscotland.org**) and ask:

- “I have a developer account and need to integrate the DATEX II feed into a mobile app backend. Please confirm: (1) the feed URL, (2) the authentication method (e.g. API key header), (3) any rate limits or recommended polling interval.”

### Step 3: Get a sample of the data (optional but very useful)

- If the portal lets you **download a sample** DATEX II file, do it and keep it (e.g. `traffic-scotland-datex-sample.xml`).
- If they give a **test URL** that returns sample data, we can use that to build and test the parser before going live.
- Share with the dev/agent: **where the file is** or **the sample URL** (and whether it needs auth). We’ll use it to see exactly what fields exist and which ones to show in the app.

### Step 4: Note the exact auth and URL for the next phase

- Write down (in a safe place, not in git):
  - **Feed URL** (production and test if different).
  - **Auth**: e.g. “API key in header `X-Api-Key`” or “Basic auth username/password”.
- We will put the **values** (API key, etc.) in **Supabase secrets** or environment variables so the receiver can use them. **Never commit these to the repo.**

### If you can’t find the feed URL (Client Id / Client Key only)

Traffic Scotland’s portal sometimes shows **API Credentials** (e.g. **Client Id** and **Client Key**) but not the actual feed URL. In that case:

1. **Look elsewhere in the portal**
   - Check every tab or menu: **Documentation**, **API**, **Services**, **DATEX II**, **Endpoints**, **Getting started**, **Usage**, etc.
   - Some portals put the base URL (e.g. `https://api.traffic-scotland...` or `https://datex2.traffic-scotland...`) in a “Documentation” or “API reference” section, and use Client Id / Client Key for authentication (e.g. in a header or to get an OAuth token).

2. **Email Traffic Scotland and ask explicitly**
   - **To:** info@trafficscotland.org (or datex2@trafficscotland.org for DATEX-specific questions)
   - **Subject:** DATEX II feed URL and use of Client Id / Client Key
   - **Suggested text (you can copy and tweak):**
     - “I have a developer account and can see my API Credentials (Client Id and Client Key) in the portal, but I cannot find the DATEX II feed URL or documentation on how to use these credentials. Could you please provide: (1) the base URL or full URL(s) for the DATEX II feed (e.g. Unplanned Events, Roadworks), (2) how to authenticate—e.g. which HTTP header names to use for Client Id and Client Key, or whether I need to exchange them for an access token first, (3) any rate limits or recommended polling interval. I am building a small backend that will poll the feed and display traffic information in a mobile app.”

3. **Possible legacy URL pattern (try only if they don’t respond or you want to experiment)**
   - Some public sources mention a pattern like: `http://datex2.traffic-scotland.co.uk/rest/2.3/publications/UnplannedEvents/Content.xml` (and similar for other publication types). This may be an older or unauthenticated feed; it might redirect to HTTPS or require auth now. Do **not** put credentials in the URL in plain text. If you try this URL in a browser and get XML back, we could use it to design the parser; the receiver would still use your Client Id/Key if/when Traffic Scotland confirm the correct authenticated endpoint.

---

## 4a. Traffic Scotland developer guide (reference)

*This section is the single source of truth for implementation. From the official Traffic Scotland developer guide.*

### Base URL

- **Base URL:** `https://datex2.trafficscotland.org/rest/2.3/`
- All publication paths are appended to this base.

### Authentication

- **Scheme:** HTTP **Basic** authentication (RFC 7617).
- **Username** = your **Client ID** (from API Credentials tab).
- **Password** = your **Client Key** (from API Credentials tab).
- **Format:** `Authorization: Basic <base64(clientid:clientkey)>`  
  i.e. encode the string `clientid:clientkey` (single colon, no spaces) as Base64 and send in the `Authorization` header.

**Example (curl):**
```bash
curl --user "<clientid>:<clientkey>" "https://datex2.trafficscotland.org/rest/2.3/publications/UnplannedEvents/Content.xml"
```

**Example (Node/JavaScript):** Create header with `Buffer.from(\`${clientId}:${clientKey}\`).toString('base64')` and set `Authorization: 'Basic ' + that`.

### Publication types

- **Dynamic** = data changes frequently (e.g. Travel Time Data). Content checked ~every 5 minutes.
- **Static** = data rarely changes (e.g. Travel Time Sites). Still checked ~every 5 minutes.

### Publication endpoints (Content = data; Metadata = “has it changed?”)

| Publication        | Description                                              | Payload type                 | Content path                                  | Metadata path                                   |
|--------------------|----------------------------------------------------------|------------------------------|-----------------------------------------------|-------------------------------------------------|
| Unplanned Events   | Incidents, roadworks, road conditions (unplanned)         | SituationPublication         | `publications/UnplannedEvents/Content.xml`     | `publications/UnplannedEvents/Metadata.xml`     |
| Current Roadworks  | Current (active) planned roadworks                       | SituationPublication         | `publications/CurrentRoadworks/Content.xml`   | `publications/CurrentRoadworks/Metadata.xml`    |
| Future Roadworks   | Future planned roadworks                                 | SituationPublication         | `publications/FutureRoadworks/Content.xml`    | `publications/FutureRoadworks/Metadata.xml`     |
| Travel Time Data   | Journey/travel times                                     | MeasuredDataPublication      | `publications/TravelTimeData/Content.xml`     | `publications/TravelTimeData/Metadata.xml`      |
| Travel Time Sites  | Details of travel time links                             | MeasurementSiteTablePublication (Static) | `publications/TravelTimeSites/Content.xml`   | `publications/TravelTimeSites/Metadata.xml`     |
| Traffic Status Data| State of traffic flow                                    | MeasuredDataPublication      | `publications/TrafficStatusData/Content.xml`  | `publications/TrafficStatusData/Metadata.xml`   |
| Traffic Status Sites | Sites where traffic status is recorded                 | MeasurementSiteTablePublication (Static) | `publications/TrafficStatusSites/Content.xml` | `publications/TrafficStatusSites/Metadata.xml` |
| VMS                | Variable message signs – status and settings             | VmsPublication               | `publications/VMS/Content.xml`                | `publications/VMS/Metadata.xml`                 |
| VMS Table          | Locations of VMS units                                   | VmsTablePublication (Static)| `publications/VMSTable/Content.xml`          | `publications/VMSTable/Metadata.xml`            |

**Index page (links to all):** `https://datex2.trafficscotland.org`

### Content vs Metadata

- **Content.xml** – The actual data. Updated when the underlying source data changes (~every 5 min check).
- **Metadata.xml** – Updated ~every minute. Contains:
  - **confirmedTime** – when `Content.xml` was last updated.
  - **confirmationTime** – when metadata was last updated (heartbeat).
- **Receiver optimisation:** Fetch `Metadata.xml` first; only fetch `Content.xml` if `confirmedTime` is newer than our last successful ingest (avoids downloading large files when nothing changed).

### Response format (Content.xml)

- Responses are **SOAP envelopes** wrapping DATEX II.
- Structure (simplified):
  - `soapenv:Envelope` → `soapenv:Body` → `d2LogicalModel` (DATEX II, xmlns `http://datex2.eu/schema/2/2_0`) → `exchange` (supplier id) + **payload** (e.g. `situationPublication`, `measuredDataPublication`, etc.).
- Parser must: (1) strip SOAP wrapper, (2) parse DATEX II payload according to publication type (SituationPublication, MeasuredDataPublication, etc.).

### Polling guidance

- Content is only updated when source data changes; checked ~every 5 minutes on their side.
- **Recommended:** Poll at most every **5–10 minutes**. Optionally: poll **Metadata** every 1–2 minutes and only fetch **Content** when `confirmedTime` changes.

### DATEX II references (for parser implementation)

- DATEX II v2.3 data model: https://docs.datex2.eu/_static/umlmodel/v2.3/index.htm  
- DATEX II v2.3 XML Schema: https://docs.datex2.eu/_static/data/v2.3/DATEXIISchema_2_2_3_0.zip  
- DATEX II v2.3 documentation: https://docs.datex2.eu/downloads/modelv23.html  

### Credentials storage

- Store **Client ID** and **Client Key** in **Supabase secrets** (e.g. `TRAFFIC_SCOTLAND_CLIENT_ID`, `TRAFFIC_SCOTLAND_CLIENT_KEY`) or in env vars for the receiver. **Never commit them to the repo.**

---

## 5. Explore the data (what we can get)

Until we have real credentials and a sample, we can’t list every field. In general, DATEX II publications contain things like:

- **Situation / event**: type (roadworks, accident, congestion, etc.), description, location (road name, direction, coordinates), start/end time, severity.
- **Roadworks**: planned vs unplanned, contractor, duration.
- **Unplanned events**: incident type, impact (lanes closed, delay), advice.

**Phase 1 (explore):**

- Once we have a sample or live response:
  - Parse one or two full responses and list **all** meaningful fields.
  - Decide which are **useful for drivers** (e.g. location, type, description, time, severity) and which we can ignore for v1.
- Then we design the **database schema** and **receiver** to store only what we need.

---

## 6. Architecture (where each part runs)

- **Traffic Scotland** → gives DATEX II feed (URL + auth).
- **Our receiver** → runs on a **schedule** (e.g. every 5–10 minutes; see §4a):
  - Calls Traffic Scotland (Basic auth with Client Id/Key), gets XML (SOAP-wrapped DATEX II).
  - Parses DATEX II and maps to our simple model (e.g. “traffic situation” with title, description, location, type, start/end, severity).
  - **Upserts** into **Supabase** tables (so we don’t duplicate; we update existing rows by external ID).
- **App (Traffic Alerts tab)** → reads from **Supabase** (e.g. via a small API or direct Supabase client), no direct call to Traffic Scotland. UI: list of alerts, tap for detail; use **GlassCard**, **TabScreenHeader**, same spacing/typography as News and Home.

**Where to run the receiver**

- **Recommended:** **Supabase Edge Function** triggered by a **cron job** (Supabase supports scheduled invocations). Benefits: same project as the app, secrets in Supabase, no extra server.
- **Alternative:** A small **Node.js** (or Python) script on a **server** or **serverless function** (e.g. Vercel, Railway) that runs on a cron schedule and writes to Supabase. Use this if you prefer not to use Edge Functions or hit their limits.

---

## 7. Database (Supabase) — draft schema

We’ll refine this after we see the real DATEX II structure. Idea: one main table of “traffic situations” that the receiver fills and the app reads.

```sql
-- Draft: traffic situations (roadworks, incidents, etc.)
create table if not exists public.traffic_situations (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,   -- from DATEX II (e.g. situation id)
  situation_type text not null,      -- e.g. 'roadworks', 'unplanned_event', 'vms', 'journey_time'
  title text,
  description text,
  location_name text,                -- road name, area
  location_direction text,           -- e.g. northbound
  severity text,                     -- e.g. 'minor', 'moderate', 'major'
  start_time timestamptz,
  end_time timestamptz,
  raw_payload jsonb,                 -- optional: keep original for debugging
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_traffic_situations_type on public.traffic_situations(situation_type);
create index idx_traffic_situations_times on public.traffic_situations(start_time, end_time);
```

- **RLS:** We can allow **all authenticated members** to **read** `traffic_situations`; **insert/update/delete** only from the receiver (using the **service role** key in the Edge Function or backend). So no RLS policy for member INSERT/UPDATE/DELETE; receiver uses service role.

---

## 8. App UI (Traffic Alerts tab) — design consistency

- **Layout:** Same as other tabs: `TabScreenHeader` (“Traffic Alerts”) → scrollable content with consistent padding (`Spacing.xl`, etc.).
- **List:** Each alert = **GlassCard** with `sleek` (smoked glass), etched border (`NeoGlass.cardBorder`). Show: title or short description, location, type (e.g. “Roadworks” / “Incident”), time/date, optional severity pill (colour from theme: e.g. major = accent/error, minor = muted).
- **Detail:** Tap a row → detail screen (e.g. `traffic-alerts/[id].tsx`) with full description, location, times, and “Source: Traffic Scotland” + link to traffic.gov.scot if we have one.
- **Empty / loading:** Loading state (e.g. “Loading…”); empty state (“No traffic alerts right now” or “No alerts in your area” if we add filtering later).
- **Copy:** Short helper text at top (e.g. “Live traffic and roadworks from Traffic Scotland. Tap an alert for details.”).
- **Icons:** Use existing icon set (e.g. `car.fill`, warning icon for incidents) and theme colours (`NeoText`, `NeoAccent`, `Radius`, `FontSize` from `constants/theme`).

---

## 9. Implementation phases (suggested order)

| Phase | What | Who / How |
|-------|------|-----------|
| **0** | You: Get Traffic Scotland feed URL + auth; optionally get sample DATEX II file. | You (steps in §4). |
| **1** | Explore: Parse a sample (or first live) DATEX II response; list fields; decide what to store. | Dev/agent: script or one-off parse; document fields. |
| **2** | DB: Add `traffic_situations` (and any extra tables) in Supabase; RLS for read-only for members. | Run SQL in Supabase; optionally add to `docs/supabase-schema.sql`. |
| **3** | Receiver: Implement DATEX II pull + parse + upsert (Edge Function or small backend); Basic auth with Client Id/Key in secrets; schedule every 5–10 min (optionally Metadata-first). | Dev/agent: Edge Function or Node script + cron. |
| **4** | App: Traffic Alerts tab — fetch from Supabase, list + detail UI with GlassCard, loading/empty states. | Dev/agent: context/hook + `traffic-alerts.tsx` + `traffic-alerts/[id].tsx`. |
| **5** | Polish: Error handling, “Last updated” label, maybe filter by type or area later. | As needed. |
| **6** | (Later) Push: Use same `traffic_situations` (or a “high severity” subset) to trigger push notifications. | Separate task. |

---

## 10. Quick reference for the next agent

- **Traffic Scotland API:** Full spec in **§4a**: base URL `https://datex2.trafficscotland.org/rest/2.3/`, **Basic auth** (Client Id = username, Client Key = password), Content.xml + Metadata.xml per publication, SOAP-wrapped DATEX II.
- **Design:** Dark theme, purple gradient background, **GlassCard** with `sleek`, **TabScreenHeader**, **NeoText** / **NeoGlass** / **Spacing** / **Radius** from `@/constants/theme`. Match News list layout but with glass cards.
- **Data flow:** Traffic Scotland (DATEX II) → Receiver (scheduled) → Supabase `traffic_situations` → App (Supabase client) → Traffic Alerts screen.
- **Credentials:** Client Id + Client Key in Supabase secrets (e.g. `TRAFFIC_SCOTLAND_CLIENT_ID`, `TRAFFIC_SCOTLAND_CLIENT_KEY`); never in repo.
- **Branch:** Work on **traffic** branch (from latest `main`).

---

## 11. Summary checklist for you

- [x] Log in at https://developer.trafficscotland.org/
- [x] Get API Credentials (Client Id, Client Key) and developer guide.
- [x] Feed URL and auth are documented in **§4a** (base URL `https://datex2.trafficscotland.org/rest/2.3/`, Basic auth with Client Id / Client Key).
- [ ] Store Client Id and Client Key in a safe place; we’ll add them to Supabase secrets when building the receiver (never commit to repo).
- [ ] Optional: use curl/PowerShell (see §4a) to fetch e.g. `UnplannedEvents/Content.xml` and save a sample for parser development.
- [ ] Then we can do Phase 1 (explore data / build parser) and Phase 2–4 (DB, receiver, app).

Once credentials are in Supabase secrets (or you’re ready to add them), we can implement the receiver and Traffic Alerts tab using §4a as the API reference.

**Setup guide for non-technical users:** See **`docs/TRAFFIC-SETUP-STEP-BY-STEP.md`** for step-by-step instructions (Supabase table, getting credentials, creating the .env file, running the receiver, and viewing alerts in the app).
