# PHD Matrix App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `handoff.md` in the project root.

**For the next agent (quick orientation):** **main** is the source of truth and is up to date with all work, including **Glasgow Roads Alerts** (bridge status, motorway tiles, command center) and the **Upcoming Events** home banner (8 venue tiles). Create new branches from main: `git checkout main && git pull origin main && git checkout -b <name>`. App: Expo SDK 54, React Native, Supabase auth + members + chat. **Home** = status card + **Glasgow Roads Alerts** card (Renfrew Bridge status + Command Center 2×2 motorway tiles M8/M80/M74/M73) + **Upcoming Events** glass card (see below) + **four menu boxes**: Your PHD Matrix; PHD Matrix: Collective Association (Campaigns, News, Casework, Library, Petitions, Polls — Chat Room and Earnings Calc are not in the menu for this version; see `constants/features.ts` to re-enable Chat). Design: dark theme, purple gradient background, smoked glass (0.03 overlay, blur 12), etched borders (0.1), Active pill #00CCFF. Code lives in `mobile/`. **Traffic:** `TrafficProvider` + `useTraffic()` (situations from `traffic_situations`); home uses `computeMotorwayStatuses(situations)` for **Command Center** tiles (copy: **“n Alert(s)”** when there are problems; slightly larger type than “ALL OK”) and `fetchBridgeStatus` + **`getBridgeBannerDisplay()`** (`lib/bridge-display.ts`) for **Renfrew Bridge** — pill + centred **CLOSURE ALERT** / scheduled times (London) / italic “Times are approximate”; **60s tick** on Home so open→closed flips at closure start without navigation. **Renfrew bridge scraper** (`supabase/functions/renfrew-bridge-status/index.ts`): parses **scheduled** closures (e.g. “will be closed” + date + `8:15am - 9:15am`) in **Europe/London** (Luxon); ignores **Last Updated** for parsing; **present closed** vs **future “will be closed”**; secrets **`BRIDGE_SUPABASE_URL`** / **`BRIDGE_SUPABASE_SERVICE_ROLE_KEY`**. **Traffic Scotland receiver** is a Supabase Edge Function at `supabase/functions/traffic-receiver/index.ts` (no GitHub workflow); legacy Node script at `scripts/traffic-receiver/` reference only. Schema: `docs/traffic-schema.sql` (includes `bridge_status`). Tabs: traffic-incidents, traffic-current-roadworks, traffic-future-roadworks, traffic-journey-times, traffic-flows, traffic-vms-signs, motorway-status/[code].

Note: the Home menu title is now `Association Members Only` and the premium icons (Campaigns/News/Casework/Library/Petitions/Polls) are starred with `star.fill` and gated by the Association Membership modal (see sections 4 and 8 for details).
---

## 1. Project overview

- **App name:** PHD Matrix  
- **What it is:** A **mobile-only** (no web) app for a **private hire drivers’ club** that works like a trade association. Members use it as part of their club membership.  
- **Target users:** Private hire drivers (similar to taxi drivers); mix of tech comfort, so **readable, clear, simple** UI is important.  
- **Product owner:** Non-technical (“vibe coding”); rely on the agent for correct, secure, professional implementation.  
- **Platform:** React Native with **Expo** (SDK 54). **Android and iOS** only; no web build required.  
- **Workspace:** `c:\Users\eddie\Documents\DriverHubApp` — the **app code lives in `mobile/`** (Expo app). There is no separate backend repo yet.
- **Version control:** Git + **GitHub** is the main workflow. See **`docs/git-daily-checklist.md`** for the simple daily steps. Never commit `mobile/.env` (Supabase keys).

**Business model (updated):** Members subscribe to the club via the **website** using **GoCardless** direct debits (no in-app purchases). The backend (or admin team) marks members as **active/expired** in the database; the app simply checks that status to allow or block access.

**Branching:** **main** is the source of truth and is up to date with all features (Chat, new tabs, sleekness UI, **Glasgow Roads Alerts**). New work is done on feature branches created from main. Always create new branches from latest main: `git checkout main && git pull origin main && git checkout -b <branch-name>`.

---

## 2. Tech stack (current)

- **Framework:** Expo ~54, React 19, React Native 0.81  
- **Routing:** expo-router (file-based). Tabs + nested stacks.  
- **Auth:** Supabase email **code** login (passwordless). Supabase JS client configured in `lib/supabase.ts`; auth context in `context/AuthContext.tsx`; sign-in UI in `components/auth/SignInScreen.tsx`.  
- **Backend data:** Supabase Postgres (project already created) with a `members` table as per `docs/supabase-schema.sql`. Member profile + membership status are loaded/saved via `lib/member-supabase.ts`. Chat uses Supabase tables `chat_messages`, `chat_reactions`, `chat_room_state`, etc. (see `docs/supabase-schema.sql`) and Realtime; see `lib/chat-supabase.ts`. **CMS:** `cms_posts` table (see `docs/cms-schema.sql`) holds articles for News, Campaigns, and Library; admin (or Table Editor) sets `type` to `'news'`, `'campaign'`, or `'library'`; app reads via `lib/cms-supabase.ts` (`fetchCmsPosts`, `fetchCmsPostById`). **Traffic Scotland data** uses tables in `docs/traffic-schema.sql`; app reads via `lib/traffic-supabase.ts` and `lib/bridge-supabase.ts`.  
- **State / data on device:** AsyncStorage is still used for some local storage:
  - **AsyncStorage** keys: `@driverhub_member`, `@driverhub_casework`, `@driverhub_news`, `@driverhub_news_seeded`, `@driverhub_polls`, `@driverhub_poll_responses`, `@driverhub_polls_seeded`, `@driverhub_poll_results_<pollId>`
- **Contexts (providers):** In `app/_layout.tsx`: `ThemeProvider` → `SafeAreaProvider` → `AuthProvider` → (inside authenticated stack) `MemberProvider` → `ActiveGate` → `CaseworkProvider` → `NewsProvider` → `PollsProvider` → **`TrafficProvider`** → `ChatProvider` → `Stack`. Do not reorder without checking dependencies.
- **Path alias:** `@/` points to project root (e.g. `@/context/MemberContext`, `@/types/member`, `@/constants/theme`).
- **Feature flags:** `mobile/constants/features.ts` — e.g. `CHAT_ROOM_VISIBLE` (false = Chat not on home menu; set true to show Chat Room again). Earnings Calc is not in the menu; route/screen remain for a later release.

**Critical dependency:** `react-native-screens` is **pinned to 4.16.0** in `package.json`. Versions 4.17+ cause a crash on Expo SDK 54 + Expo Go: `java.lang.String cannot be cast to java.lang.Boolean`. Do not upgrade it without testing on a real device/Expo Go.

---

## 3. App structure (file-based routes)

```
mobile/
├── app/
│   ├── _layout.tsx          # Root: GradientPortalBackground (fixed), ThemeProvider, SafeAreaProvider, AuthProvider, MemberProvider, CaseworkProvider, NewsProvider, PollsProvider, TrafficProvider, ChatProvider, Stack
│   ├── modal.tsx            # Placeholder modal (expo-router)
│   └── (tabs)/
│       ├── _layout.tsx      # No bottom tab bar. AppHeader (logo + PHD MATRIX + Home) then TabSlot. Hidden TabList for all routes.
│       ├── index.tsx        # Home: status GlassCard + Glasgow Roads Alerts + Upcoming Events (8 tiles: 4 Ticketmaster + 2×2 sport) + four menu boxes (Your PHD Matrix; Association Members Only: …; Glasgow Traffic Data; Glasgow Events Data). Chat/Earnings Calc hidden via constants/features.ts. Event UI + constants: `MOTORWAY_TILE_BG` / `MOTORWAY_TILE_BORDER` (match CommandCenterTiles), `BRIDGE_ALERT_AMBER` (bridge closure warning + gig titles + fixture team/vs lines), `GIG_VENUE_SHORT_LABEL`, `truncateGigEventTitle`, `formatFixtureDateTime`, `getFixtureTeams`, `renderEventCell(venueKey,'gig'|'fixture')`.
│       ├── profile.tsx      # Profile: TabScreenHeader "Profile" + MembershipCard + editable form, Save
│       ├── chat.tsx         # Chat Group: TabScreenHeader + glass box (messages) + quote bar + composer; keyboard via marginBottom
│       ├── more.tsx         # More: TabScreenHeader "More" + placeholder
│       ├── campaigns/       # CMS list + detail (cms_posts type=campaign)
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List tiles; tap → campaigns/[id]
│       │   └── [id].tsx     # Full article
│       ├── events-gigs.tsx  # Gigs & Shows
│       ├── events-sport.tsx # Sport Events
│       ├── events-other.tsx # Other Events
│       ├── earnings-calc.tsx
│       ├── library/         # CMS list + detail (cms_posts type=library)
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List tiles; tap → library/[id]
│       │   └── [id].tsx     # Full article
│       ├── petitions.tsx
│       ├── docs-vault.tsx
│       ├── member-e-card.tsx
│       ├── traffic-incidents/
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List of incidents (from traffic_situations); search/filter by road
│       │   └── [id].tsx     # Incident detail
│       ├── traffic-current-roadworks/
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List current roadworks
│       │   └── [id].tsx     # Roadwork detail
│       ├── traffic-future-roadworks/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── traffic-journey-times.tsx   # Journey times (travel time sites)
│       ├── traffic-flows.tsx           # Traffic flow status
│       ├── traffic-vms-signs.tsx       # VMS signs
│       ├── motorway-status/
│       │   └── [code].tsx   # M8 / M80 / M74 / M73 alerts (from situations)
│       ├── casework/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   ├── new.tsx
│       │   └── [id].tsx
│       ├── news/            # CMS list + detail (cms_posts type=news); NewsContext fetches from Supabase
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # Glass tiles (CmsPostTile); tap → news/[id]
│       │   └── [id].tsx     # Full article (ArticleDetailContent)
│       └── polls/
│           ├── _layout.tsx
│           ├── index.tsx
│           └── [id].tsx
├── components/
│   ├── GradientPortalBackground.tsx
│   ├── AppHeader.tsx
│   ├── TabScreenHeader.tsx
│   ├── FrostedGlassView.tsx
│   ├── MembershipCard.tsx
│   ├── CommandCenterTiles.tsx   # 2×2 motorway tiles (M8, M80, M74, M73); red/green; “n Alert(s)” or ALL OK; tap → motorway-status/[code]
│   ├── CmsPostTile.tsx          # Shared article tile (title, date, excerpt, optional thumbnail) for News/Campaigns/Library
│   ├── ArticleDetailContent.tsx # Shared full-article body (title, meta, body with clickable URLs)
│   ├── parallax-scroll-view.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── AssociationMembershipGate.tsx
│   ├── AssociationMembershipModal.tsx
│   ├── auth/
│   │   ├── SignInScreen.tsx
│   │   └── NotActiveScreen.tsx # legacy paywall screen; membership gating moved to AssociationMembershipGate
│   └── ui/
│       ├── Card.tsx
│       ├── GlassCard.tsx
│       ├── PrimaryButton.tsx
│       └── icon-symbol.tsx
├── constants/
│   ├── theme.ts
│   └── features.ts   # CHAT_ROOM_VISIBLE etc.
├── context/
│   ├── MemberContext.tsx
│   ├── CaseworkContext.tsx
│   ├── NewsContext.tsx
│   ├── PollsContext.tsx
│   ├── TrafficContext.tsx    # useTraffic(): situations, isLoading, error, refresh, getSituation(id)
│   └── ChatContext.tsx
├── hooks/
│   ├── use-color-scheme.ts
│   └── use-theme-color.ts
├── lib/
│   ├── supabase.ts
│   ├── member-storage.ts
│   ├── member-supabase.ts
│   ├── casework-storage.ts
│   ├── news-storage.ts   # Legacy; News now uses cms-supabase
│   ├── cms-supabase.ts   # fetchCmsPosts(supabase, type), fetchCmsPostById(supabase, id)
│   ├── polls-storage.ts
│   ├── chat-supabase.ts
│   ├── traffic-supabase.ts    # fetchTrafficSituations(supabase)
│   ├── bridge-supabase.ts    # fetchBridgeStatus(supabase, id?) → BridgeStatus
│   ├── bridge-display.ts     # getBridgeBannerDisplay(bridge, hasError) → pill + structured planned/in-progress warnings vs next_closure_* times
│   ├── traffic-status.ts     # computeMotorwayStatuses(situations) → MotorwayStatus[] (M8, M80, M74, M73)
│   ├── events-supabase.ts    # fetchGlasgowEventsForBanner; GLASGOW_EVENT_VENUE_ORDER, GLASGOW_GIG_VENUE_ORDER, GLASGOW_FIXTURE_VENUE_ROWS
│   └── push-device-supabase.ts
└── types/
    ├── member.ts
    ├── casework.ts
    ├── cms.ts        # CmsPost, CmsPostType (news | campaign | library)
    ├── news.ts       # Legacy NewsPost; News uses CmsPost from CMS
    ├── polls.ts
    ├── chat.ts
    ├── traffic.ts    # TrafficSituation
    ├── bridge.ts     # BridgeStatus (id, name, status: 'open'|'closed'|'unknown', etc.)
    └── events.ts     # GlasgowVenueKey, GlasgowEventBannerRow (gig/sport banner rows)
```

**Removed / legacy:** `DashboardMenuBar.tsx`, `DashboardMenuTabBar.tsx` (no longer in codebase). `GlassTabBar.tsx`, `haptic-tab.tsx` exist but are legacy/unused. There is no single `traffic-alerts.tsx`; traffic is split into traffic-incidents, traffic-current-roadworks, traffic-future-roadworks, traffic-journey-times, traffic-flows, traffic-vms-signs, and motorway-status/[code].

---

## 4. Navigation and layout (current)

- **No bottom tab bar.** The home screen **is** the main menu.
- **Global header (every tab):** `AppHeader` at the top of `(tabs)/_layout.tsx`: left = logo + “PHD MATRIX”; right = “Home” button. Logo, title, and Home navigate to `/`.
- **Tab content:** Below the header, `TabSlot` renders the active route. Routes are switched by navigating from home menu tiles or header.
- **Tab screen headers:** Every tab except home uses `TabScreenHeader` with a single title.
- **Home screen content (top to bottom):** (1) **Status card** (GlassCard, sleek + gradient border when active). (2) **Glasgow Roads Alerts** card: header “Glasgow Roads Alerts”, **Renfrew Bridge** banner — pill from `getBridgeBannerDisplay()` using `bridge_status` + **`next_closure_start` / `next_closure_end`** when set (open before window, closed during, open after); planned closure shows centred **CLOSURE ALERT:** (bold) + date/times in London + italic second line; **60s** interval on Home recomputes pill/warning. **Command Center** 2×2 tiles (M8, M80, M74, M73): red/green from `computeMotorwayStatuses(situations)`; problem state shows **“n Alert(s)”** (larger than ALL OK); tap → `/motorway-status/[code]`. (3) **Upcoming Events** glass card: single header “Upcoming Events”; **three rows** in one stack — **row 1:** four Ticketmaster venues (OVO Hydro, SWG3, Barrowlands, O2 Academy) as compact tiles; **rows 2–3:** sport fixtures 2×2 (Celtic Park venue label **Parkhead**, Ibrox, Firhill, Hampden). **Tile chrome** matches motorway tiles: blue fill `rgba(40, 80, 200, 0.22)`, light blue border `rgba(140, 180, 255, 0.7)`, `Radius.lg`. **Gigs:** short venue labels **HYDRO / SWG3 / BARRAS / THE O2** (underlined, `#E5EDFF`, body semibold); event title **max 14 chars + …**, one line, **`BRIDGE_ALERT_AMBER`** (`rgba(255, 220, 150, 0.95)` — same as bridge closure alert copy); date/time bottom, **hyphen** between date and time (`formatFixtureDateTime`), **grey** (`NeoText.muted`), small (10px). **Fixtures:** stadium name top (**uppercase**, underlined, centred, motorway-style `#E5EDFF`); middle **home / vs / away** when `home_team`+`away_team` or parsed `vs` in title — all **`BRIDGE_ALERT_AMBER`**; bottom date/time motorway-meta style (xs, muted). Data: `fetchGlasgowEventsForBanner` in `lib/events-supabase.ts` from `glasgow_events`; venue order `GLASGOW_GIG_VENUE_ORDER` + `GLASGOW_FIXTURE_VENUE_ROWS` (Celtic+Ibrox row, Firhill+Hampden row). (4) **Four menu boxes:** Your PHD Matrix (Profile, Docs Vault, Member E-Card); **Association Members Only** (Campaigns, News, Casework, Library, Petitions, Polls — each icon has a yellow `star.fill`). When a user is **not active**, tapping these icons shows the “Association Membership” modal (no navigation). When a user **is active**, tapping navigates to the premium screens. Chat Room is hidden via `mobile/constants/features.ts` in this version. **No** announcement boxes in current home layout.
- **Other tab screens:** Each uses `View` → `TabScreenHeader` → `ScrollView` (or list) with content. *(Home item (3) above replaces any older “Glasgow Events Alerts” copy — there is no separate “Upcoming Fixtures” sub-header.)*

---

## 5. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, membershipStatus, etc. Single object per device (profile is saved/edited in the app; membership status comes from Supabase).
- **MemberStatus** (`context/MemberContext`): `isActive` (membership_status = `active`), `membershipStatus` (active/expired/pending), `isChatModerator`, and `isAdmin` (from `members.is_admin`).
- **Casework:** Tickets with messages, status flow, attachments. Member side implemented; admin sets status and replies.
- **News, Campaigns, Library:** CMS articles in Supabase `cms_posts` (see **5b**). One table; `type` = 'news' | 'campaign' | 'library'. Admin (or Table Editor) inserts rows; app shows list tiles and full article on tap.
- **Polls:** Poll with questions/options; members answer only. Results visible when closed.
- **Chat:** Single global room; messages, reactions, Realtime; mod actions. See `docs/supabase-schema.sql`.
- **Traffic:** `TrafficSituation` (`types/traffic.ts`) from Supabase `traffic_situations`. `BridgeStatus` (`types/bridge.ts`): id, name, status ('open'|'closed'|'unknown'), current_message, next_closure_*, updated_at.

**5a. Traffic Scotland and bridge — tables and receiver (updated)**

- **Schema:** `docs/traffic-schema.sql` defines: `traffic_situations`, `traffic_travel_times`, `traffic_travel_time_sites`, `traffic_traffic_status`, `traffic_traffic_status_sites`, `traffic_vms`, `traffic_vms_table`, **`bridge_status`**. All have RLS (authenticated read).
- **Receiver (current):** Supabase Edge Function at `supabase/functions/traffic-receiver/index.ts`. Fetches all Traffic Scotland DATEX II publications (UnplannedEvents, CurrentRoadworks, FutureRoadworks, TravelTimeData, TravelTimeSites, TrafficStatusData, TrafficStatusSites, VMS, VMSTable) and upserts into **all** traffic tables: `traffic_situations`, `traffic_travel_times`, `traffic_travel_time_sites`, `traffic_traffic_status`, `traffic_traffic_status_sites`, `traffic_vms`, `traffic_vms_table`. Runs on a Supabase schedule (pg_cron / Edge Function cron) every ~15 minutes; **no GitHub Actions** are used for this receiver anymore. Legacy Node script at `scripts/traffic-receiver/index.js` remains as a reference.
- **Bridge status:** Table `bridge_status` (id, name, status, current_message, next_closure_*, updated_at). App: `fetchBridgeStatus` in `lib/bridge-supabase.ts`; Home uses `getBridgeBannerDisplay()` in `lib/bridge-display.ts` so scheduled windows drive the pill even if `status` were stale. **Edge Function** `supabase/functions/renfrew-bridge-status/index.ts` scrapes the council page: **Luxon** + **Europe/London**; parses **“will be closed”** + date + **am/pm time range**; strips content after **Last Updated** for parsing; **does not** treat “closed” inside **will be closed** as closed now (present closure uses cues like *currently closed*, *closed to traffic*, *bridge closure*). **Secrets:** `BRIDGE_SUPABASE_URL`, `BRIDGE_SUPABASE_SERVICE_ROLE_KEY` (see `docs/renfrew-bridge-status.md`). Deploy on a schedule (e.g. every 5–10 min).
- **Motorway status on home:** Derived from `traffic_situations` via `computeMotorwayStatuses(situations)` in `lib/traffic-status.ts`. Supports M8, M80, M74, M73; `CommandCenterTiles` shows red **n Alert(s)** or green **ALL OK**.
- **Run receiver locally:** See `docs/traffic-receiver.md`. Bridge status: deploy and invoke Supabase function per `docs/renfrew-bridge-status.md`.
- **App today:** Home shows bridge status + Command Center motorway tiles. Traffic tab group: incidents, current/future roadworks (list + detail from situations), journey-times, flows, VMS screens; motorway-status/[code] shows situations for that motorway. Travel times, traffic status, and VMS **data** are in the DB; UI for journey-times/flows/VMS may be placeholder or partial — confirm in code.

**5b. CMS (News, Campaigns, Library)**

- **Schema:** `docs/cms-schema.sql` defines `cms_posts` (id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at). Run in Supabase SQL Editor once. RLS: **active members only** can read; write via service role (admin panel later).
- **Admin:** One publishing screen (future): admin selects tag News / Campaign / Library; article appears in the right app section. Until then, insert rows in Supabase Table Editor with `type` set to `'news'`, `'campaign'`, or `'library'`.
- **App:** News (NewsContext + list/detail), Campaigns (campaigns/index + campaigns/[id]), Library (library/index + library/[id]) all use `fetchCmsPosts(supabase, type)` and `fetchCmsPostById`; shared `CmsPostTile` and `ArticleDetailContent`.

---

## 6. Design system (Neo-Gradients Glassmorphism, fixed dark)

- **Fixed dark theme:** The app always uses the dark design. `useColorScheme()` returns `'dark'`.
- **Background:** Purple gradient portal (blue–purple glow) in `GradientPortalBackground`. All screens use transparent theme background; use **GlassCard** / **FrostedGlassView** for content blocks.
- **Glassmorphism:** Default glass: rgba(255,255,255,0.07) overlay + expo-blur 20. “Smoked glass”: overlay rgba(255,255,255,0.03), intensity 10–15. Etched border: NeoGlass.cardBorder (0.1). Active: gradient border #00ccff → #1a0033; Active pill #00CCFF. Section labels: smaller, letterSpacing 2, rgba(255,255,255,0.5). Menu icons: white, shadowColor #00CCFF. Chat own bubbles: gradient #00CCFF → #040A4B, borderRadius 16.
- **Palette:** Base #101115. Portal gradient #3D37F2 → #8930F3. Text: NeoText.primary, secondary, muted. Accents: NeoAccent.purple, cyan.
- **Spacing / Radius:** `Spacing.*`, `Radius.card` (32), `Radius.lg` (16) in `constants/theme.ts`.

---

## 7. Chat screen — layout and keyboard

- **Title:** “Chat Group” in `TabScreenHeader`. Mod menu (⋮) for moderators.
- **Scroll area:** Message list inside smoked glass container; FlatList; composer and quote bar below.
- **Composer:** Uses **marginBottom: keyboardHeight** when keyboard is open (Keyboard.addListener). No KeyboardAvoidingView.

---

## 8. What is implemented and working

- **Home:** Status card + Glasgow Roads Alerts card (Renfrew Bridge status + Command Center M8/M80/M74/M73 tiles) + **Upcoming Events** 8-tile banner (see §4) + four menu boxes. Premium menu icons (Campaigns/News/Casework/Library/Petitions/Polls) are starred and membership-gated via the Association Membership modal (non-active users see the modal; active users navigate normally).
- **Profile:** MembershipCard + form + Save.
- **Casework:** List, New request, ticket detail with thread and reply.
- **News:** List + detail with tappable URLs.
- **Polls:** Open/Closed lists; take poll; thank-you; results when closed.
- **Chat:** Messages, quote, reactions, Realtime, mod actions; keyboard handling.
- **Traffic (Glasgow Roads Alerts):** Renfrew Bridge on home with **scheduled-closure** handling (scraper + `getBridgeBannerDisplay` + 60s Home tick); Command Center tiles show **“n Alert(s)”** when problems; traffic-incidents, traffic-current-roadworks, traffic-future-roadworks (list + detail); traffic-journey-times, traffic-flows, traffic-vms-signs screens; motorway-status/[code] for per-motorway situations. TrafficContext (situations, refresh, getSituation); TrafficProvider in root layout. All traffic tables are populated by the **traffic-receiver Supabase Edge Function** (no GitHub-based receiver).
- **Glasgow events banner (Home):** **`mobile/app/(tabs)/index.tsx`** — `GlassCard` with `eventsTilesStack`: gig row + `eventsFixtureGrid`. Reads `public.glasgow_events` via **`mobile/lib/events-supabase.ts`** (`fetchGlasgowEventsForBanner`). Types: **`mobile/types/events.ts`** (`GlasgowVenueKey`, `GlasgowEventBannerRow` with `homeTeam`/`awayTeam`). Venue constants: **`GLASGOW_EVENT_VENUE_ORDER`** (fetch/upsert set), **`GLASGOW_GIG_VENUE_ORDER`**, **`GLASGOW_FIXTURE_VENUE_ROWS`**. Schema: **`docs/supabase-schema.sql`** (`glasgow_events`). Populated by Edge Functions **`ticketmaster-events`** and **`sportsdb-events`**. **Writes use PostgREST `fetch` upserts** (`supabase/functions/_shared/glasgow-events-upsert.ts`), not `supabase-js` upsert, to avoid Edge runtime bugs (`reading 'error'`). **Ticketmaster:** strict **spike rate limit** — env `TICKETMASTER_MIN_INTERVAL_MS` (default **450**) between Discovery calls + **429 retries**; optional `TICKETMASTER_DAYS_AHEAD`. **Sports:** `eventsround` window + TheSportsDB pacing/429 retries; per-request failures are **non-fatal** (warnings collected, run continues). **Response is HTTP 200** with JSON `{ ok, sportsdbEventsUpserted, warnings?, error? }` — read **`ok` and `error`** (true failure = missing secrets or DB upsert failed); **`warnings`** = skipped rounds / API flakes. Rare **500** = crash in the outer handler only.
- **Auth + membership gating:** Supabase email code login. Signed-in users always reach the main app (paywall removed; `NotActiveScreen` is legacy/unused). Membership status drives: status card UI + push token registration (only for active members) + premium feature access. Premium screens (Campaigns, News, Casework, Library, Petitions, Polls) are wrapped with `AssociationMembershipGate` which shows the “Association Membership” modal and blocks access for non-active members (including deep links). Also note: `AuthContext` validates that the Supabase auth user still exists; if the auth user was deleted server-side, the app clears the session and returns to sign-in.
- **Sign-in UI:** `SignInScreen` uses updated copy (“Sign in or register with your email address…”), and the “Send code” button styling is solid cyan (no purple gradient).
- **Expo Go:** `npx expo start` from `mobile/`. Use Command Prompt on Windows if PowerShell has script policy issues.

---

## 9. What is NOT done (future work)

- **Traffic:** Travel times, traffic status, and VMS tables are populated by the **traffic-receiver Supabase Edge Function**; confirm which screens show real data vs placeholders and enhance as needed. Bridge status depends on the `renfrew-bridge-status` Edge Function being deployed and run on a schedule.
- **Other tabs:** Campaigns, events-gigs, events-sport, events-other, Earnings Calc, Library, Petitions, Docs Vault, Member E-Card — flesh out as needed.
- **Backend / API:** Supabase for auth + members + chat; no full API layer or GoCardless integration yet.
- **Admin:** No admin app; use Supabase Table Editor for now.
- **Notifications:** Push foundation exists; not yet sending.
- **GoCardless:** Website + backend; app only checks membership status.

---

## 10. Known issues / snags (user noted)

- **react-native-screens:** Must stay at 4.16.0 for Expo Go + SDK 54 (§2).
- **Windows:** User may run npm in **Command Prompt**; PowerShell can have execution policy issues.
- **Node/npx:** Project created with `npx create-expo-app@latest mobile` in `DriverHubApp`.

---

## 11. How to run the app

```cmd
cd c:\Users\eddie\Documents\DriverHubApp\mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go**. Use **Command Prompt** on Windows if needed.

**Branching:** **main** is source of truth. For new work: `git checkout main`, `git pull origin main`, `git checkout -b <branch-name>`. When a feature is done, merge to main and push; see `docs/git-daily-checklist.md`.

---

## 12. Suggested next tasks (pick as needed)

1. **Traffic:** Verify journey-times, flows, and VMS screens use real Supabase data; add or polish UI. Ensure bridge Edge Function is scheduled and `bridge_status` is fresh.
2. **Other tabs:** Add real content for Campaigns, events-*, Earnings Calc, Library, Petitions, Docs Vault, Member E-Card.
3. **Snagging:** Polish touch targets, readability, layout.
4. **Backend design:** API and schema for member, casework, news, polls.
5. **Admin:** Admin UI for casework, news, polls.
6. **Notifications:** Push or in-app for casework and expiry reminders.
7. **Subscriptions:** GoCardless + backend driving membership status in Supabase.

---

## 13. Quick reference for the next agent

- **Member:** `useMember()` from `@/context/MemberContext`; `saveMember(profile)`.
- **Association membership gating:** `AssociationMembershipGate` wraps premium screens (News/Campaigns/Casework/Library/Petitions/Polls) and shows `AssociationMembershipModal` for non-active members; Home premium icons use the same modal + `memberStatus.isActive` to decide navigation.
- **Casework:** `useCasework()`; `createTicket(...)`; `addMessage(ticketId, 'member', text)`.
- **News:** `useNews()`; `posts` (CmsPost[] from Supabase), `getPost(id)`; list/detail from `cms_posts` type=news. **Campaigns/Library:** fetch via `fetchCmsPosts(supabase, 'campaign'|'library')`, detail `fetchCmsPostById(supabase, id)`. Shared: `CmsPostTile`, `ArticleDetailContent`. Schema: `docs/cms-schema.sql`.
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` after close.
- **Chat:** `useChat()`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods).
- **Traffic:** `useTraffic()` from `@/context/TrafficContext`; `situations`, `refresh`, `getSituation(id)`. `computeMotorwayStatuses(situations)` from `@/lib/traffic-status` for Command Center tiles; UI in `CommandCenterTiles` (**n Alert(s)** / ALL OK). Bridge: `fetchBridgeStatus(supabase, 'renfrew_bridge')` from `@/lib/bridge-supabase`; display via `getBridgeBannerDisplay(bridge, hasError)` from `@/lib/bridge-display` (uses `next_closure_*` instants vs device time). Home: 60s interval bumps state so the bridge pill updates across closure boundaries without leaving the screen.
- **Theme:** `useThemeColor(...)`; `Spacing`, `Radius`, `FontSize`, `NeoGlass`, `NeoText` from `@/constants/theme`. Glass: `GlassCard` with `sleek`, `gradientBorder`; `FrostedGlassView` with `intensity`, `overlayColor`.
- **Routing:** `router.push('/')` (home); `router.push('/profile')`, `router.push('/chat')`, `router.push('/casework')`, `router.push('/news')`, `router.push('/polls')`, `router.push('/more')`; `router.push('/campaigns')`, `router.push('/events-gigs')`, `router.push('/events-sport')`, `router.push('/events-other')`; `router.push('/traffic-incidents')`, `router.push('/traffic-current-roadworks')`, `router.push('/traffic-future-roadworks')`, `router.push('/traffic-journey-times')`, `router.push('/traffic-flows')`, `router.push('/traffic-vms-signs')`, `router.push(\`/motorway-status/${code}\`)` (e.g. M8, M80, M74, M73); `router.push('/earnings-calc')`, `router.push('/library')`, `router.push('/petitions')`, `router.push('/docs-vault')`, `router.push('/member-e-card')`; `router.push(\`/casework/${id}\`)`, etc.
- **Header / layout:** `AppHeader`, `TabScreenHeader` in `components/`. No bottom bar; home is the main menu.
- **Git:** **main** = source of truth. Use feature branches for new work; merge to main when ready.
- **Traffic receiver:** `scripts/traffic-receiver/`; `.env` with Traffic Scotland + Supabase keys; `node index.js`. Schema: `docs/traffic-schema.sql`. Guide: `docs/traffic-receiver.md`. Bridge: `docs/renfrew-bridge-status.md`.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
