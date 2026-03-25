# PHD Matrix App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `handoff.md` in the project root.

**For the next agent (quick orientation):** **main** is the source of truth and is up to date with all work, including **Glasgow Roads Alerts** (bridge status, motorway tiles, command center) and the **Upcoming Events** banner (8 venue tiles) on the **Scout** hub. **In-app admin** (`/admin`, `members.is_admin`): dashboard + **News System** (list / create / edit CMS articles, home-announcement toggle on edit only), **Casework System** (cyan “Manually Create…” + Active/Closed glass panels — placeholders), **Polls & Surveys** (Polls/Surveys pills, cyan create tiles, Active/Closed glass lists from `PollsContext`; surveys are UI shell), **Membership System** (Basic / Association / Lapsed / Cancelled pills + placeholders). Create new branches from main: `git checkout main && git pull origin main && git checkout -b <name>`. App: Expo SDK 54, React Native, Supabase auth + members + chat. **Three hubs** (fixed bottom bar: Home, Scout, Association): **Home** (`index.tsx`) = membership status GlassCard + **Your PHD Matrix** menu only. **Scout** (`scout.tsx`) = **Glasgow Roads Alerts** + **Upcoming Events** + **Glasgow Traffic Data** menu. **Association** (`association.tsx`) = **Association Members Only** dashboard tiles (News and Updates, Casework, Library, Polls, Member E-Card, Coming Soon; Chat Room and Earnings Calc per `constants/features.ts`). **Campaigns** CMS type and `/campaigns` routes are removed. Member E-Card is **premium** (gate + `AssociationMembershipGate` on the screen). **Glasgow Events Data** (gigs/sport/other list shortcuts) was removed from the UI; `events-gigs` / `events-sport` / `events-other` routes may remain without menu entry. Design: dark theme, purple gradient background, smoked glass (0.03 overlay, blur 12), etched borders (0.1), Active pill #00CCFF. Code lives in `mobile/`. **Traffic:** `TrafficProvider` + `useTraffic()`; Scout uses `computeMotorwayStatuses(situations)` for **Command Center** tiles and `useBridgeBanner` (`hooks/useBridgeBanner.ts`) + **`getBridgeBannerDisplay()`** for **Renfrew Bridge**; **60s tick** on Scout for bridge pill updates. **Renfrew bridge scraper** (`supabase/functions/renfrew-bridge-status/index.ts`): parses **scheduled** closures (e.g. “will be closed” + date + `8:15am - 9:15am`) in **Europe/London** (Luxon); ignores **Last Updated** for parsing; **present closed** vs **future “will be closed”**; secrets **`BRIDGE_SUPABASE_URL`** / **`BRIDGE_SUPABASE_SERVICE_ROLE_KEY`**. **Traffic Scotland receiver** is a Supabase Edge Function at `supabase/functions/traffic-receiver/index.ts` (no GitHub workflow); legacy Node script at `scripts/traffic-receiver/` reference only. Schema: `docs/traffic-schema.sql` (includes `bridge_status`). Deep routes: traffic-incidents, traffic-current-roadworks, traffic-future-roadworks, traffic-journey-times, traffic-flows, traffic-vms-signs, motorway-status/[code].

Note: **Association** hub title is `Association Members Only`; premium icons are starred with `star.fill` and gated by the Association Membership modal for non-active users (see sections 4 and 8).
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
- **Backend data:** Supabase Postgres (project already created) with a `members` table as per `docs/supabase-schema.sql`. Member profile + membership status are loaded/saved via `lib/member-supabase.ts`. Chat uses Supabase tables `chat_messages`, `chat_reactions`, `chat_room_state`, etc. (see `docs/supabase-schema.sql`) and Realtime; see `lib/chat-supabase.ts`. **CMS:** `cms_posts` table (see `docs/cms-schema.sql`) holds articles for News and Library; admin (or Table Editor) sets `type` to `'news'` or `'library'`; app reads via `lib/cms-supabase.ts` (`fetchCmsPosts`, `fetchCmsPostById`). **Traffic Scotland data** uses tables in `docs/traffic-schema.sql`; app reads via `lib/traffic-supabase.ts` and `lib/bridge-supabase.ts`.  
- **State / data on device:** AsyncStorage is still used for some local storage:
  - **AsyncStorage** keys: `@driverhub_member`, `@driverhub_casework`, `@driverhub_news`, `@driverhub_news_seeded`, `@driverhub_polls`, `@driverhub_poll_responses`, `@driverhub_polls_seeded`, `@driverhub_poll_results_<pollId>`
- **Contexts (providers):** In `app/_layout.tsx`: `ThemeProvider` → `SafeAreaProvider` → `AuthProvider` → (inside authenticated stack) `MemberProvider` → `ActiveGate` → `CaseworkProvider` → `NewsProvider` → `PollsProvider` → **`TrafficProvider`** → `ChatProvider` → `Stack`. Do not reorder without checking dependencies.
- **Path alias:** `@/` points to project root (e.g. `@/context/MemberContext`, `@/types/member`, `@/constants/theme`).
- **Feature flags:** `mobile/constants/features.ts` — e.g. `CHAT_ROOM_VISIBLE` (false = Chat not on Association hub menu; set true to show Chat Room again). Earnings Calc is not in the menu; route/screen remain for a later release.

**Critical dependency:** `react-native-screens` is **pinned to 4.16.0** in `package.json`. Versions 4.17+ cause a crash on Expo SDK 54 + Expo Go: `java.lang.String cannot be cast to java.lang.Boolean`. Do not upgrade it without testing on a real device/Expo Go.

---

## 3. App structure (file-based routes)

```
mobile/
├── app/
│   ├── _layout.tsx          # Root: GradientPortalBackground (fixed), ThemeProvider, SafeAreaProvider, AuthProvider, MemberProvider, CaseworkProvider, NewsProvider, PollsProvider, TrafficProvider, ChatProvider, Stack
│   ├── modal.tsx            # Placeholder modal (expo-router)
│   └── (tabs)/
│       ├── _layout.tsx      # Stack: AppHeader (logo + PHD MATRIX; tap → /) + Stack + MainBottomBar (Home / Scout / Association).
│       ├── index.tsx        # Home hub: membership status GlassCard + Your PHD Matrix menu (`MenuIconGrid`).
│       ├── scout.tsx        # Scout hub: Glasgow Roads Alerts (`GlasgowRoadsAlertsCard`) + Upcoming Events (`UpcomingEventsCard`, `useGlasgowEventsBanner`) + Glasgow Traffic Data menu.
│       ├── association.tsx  # Association hub: dashboard glass tiles + premium modal.
│       ├── profile.tsx      # Profile: TabScreenHeader "Profile" + MembershipCard + editable form, Save
│       ├── admin/           # Admin: `AdminAccessGate` + Stack
│       │   ├── _layout.tsx  # Stack (headerless options from `appStackScreenOptions`)
│       │   ├── index.tsx    # Admin hub: glass tiles → News, Casework, Polls & Surveys, Membership
│       │   ├── news/        # News System (nested Stack)
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx    # Landing: cyan “Create News Article” + glass “Articles” list
│       │   │   ├── create.tsx   # Publish article (`NewsArticleEditor` + `insertCmsNewsPost`)
│       │   │   └── [id].tsx     # Edit article (`updateCmsNewsPost` + home switch on same form)
│       │   ├── casework.tsx # Cyan manual-create tile + Active Cases / Closed Cases glass panels (placeholders)
│       │   ├── polls.tsx    # Polls/Surveys pills, cyan create tiles, Active/Closed glass lists (`usePolls`)
│       │   └── membership.tsx # Pills: Basic, Association, Lapsed, Cancelled + placeholder panel
│       ├── chat.tsx         # Chat Group: TabScreenHeader + glass box (messages) + quote bar + composer; keyboard via marginBottom
│       ├── more.tsx         # More: TabScreenHeader "More" + placeholder
│       ├── events-gigs.tsx  # Gigs & Shows
│       ├── events-sport.tsx # Sport Events
│       ├── events-other.tsx # Other Events
│       ├── earnings-calc.tsx
│       ├── library/         # CMS list + detail (cms_posts type=library)
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List tiles; tap → library/[id]
│       │   └── [id].tsx     # Full article
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
│       ├── news/            # CMS list + detail (cms_posts type=news); NewsContext loads news only
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List (`CmsPostTile`); tap → news/[id]
│       │   └── [id].tsx     # Full article (ArticleDetailContent)
│       └── polls/
│           ├── _layout.tsx
│           ├── index.tsx
│           └── [id].tsx
├── components/
│   ├── GradientPortalBackground.tsx
│   ├── MainBottomBar.tsx    # Fixed bottom hub nav; car-style segments; `getActiveDashboardTab(pathname)`
│   ├── AppHeader.tsx          # Admin link (right) when `memberStatus.isAdmin`
│   ├── AdminAccessGate.tsx    # Re-verify `is_admin` from Supabase on focus; redirect non-admins home
│   ├── home/
│   │   ├── GlasgowRoadsAlertsCard.tsx
│   │   ├── UpcomingEventsCard.tsx
│   │   └── MenuIconGrid.tsx
│   ├── TabScreenHeader.tsx
│   ├── FrostedGlassView.tsx
│   ├── MembershipCard.tsx
│   ├── CommandCenterTiles.tsx   # 2×2 motorway tiles (M8, M80, M74, M73); red/green; “n Alert(s)” or ALL OK; tap → motorway-status/[code]
│   ├── CmsPostTile.tsx          # Shared article tile (title, date, excerpt, optional thumbnail) for News/Library
│   ├── ArticleDetailContent.tsx # Shared full-article body (title, meta, body with clickable URLs)
│   ├── parallax-scroll-view.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── AssociationMembershipGate.tsx
│   ├── AssociationMembershipModal.tsx
│   ├── admin/
│   │   ├── AdminAreaHeader.tsx      # Back (default → `/admin`), Admin Dashboard title, `MenuSectionEyebrow` subsystem
│   │   ├── AdminSubpageScaffold.tsx # Header + ScrollView; optional `onBackPress` / `backLabel`, `refreshControl`, `keyboardShouldPersistTaps`
│   │   └── NewsArticleEditor.tsx    # Shared CMS form: title, body, excerpt, home-announcement switch, submit
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
│   ├── use-theme-color.ts
│   ├── useBridgeBanner.ts       # fetchBridgeStatus + 60s tick + getBridgeBannerDisplay
│   └── useGlasgowEventsBanner.ts
├── lib/
│   ├── supabase.ts
│   ├── member-storage.ts
│   ├── member-supabase.ts
│   ├── casework-storage.ts
│   ├── news-storage.ts   # Legacy; News now uses cms-supabase
│   ├── cms-supabase.ts   # fetchCmsPosts, fetchCmsPostById, fetchFrontPageAnnouncementPosts, insertCmsNewsPost, updateCmsNewsPost, setCmsPostFrontPageAnnouncement
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
    ├── cms.ts        # CmsPost, CmsPostType (news | library)
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

- **Bottom hub bar (always visible):** `MainBottomBar` at the bottom of `(tabs)/_layout.tsx` — large **Home**, **Scout**, **Association** segments (car-style matte panel, cyan active state). Uses `router.push` to `/`, `/scout`, `/association`. **Active highlight** from `usePathname()` via `getActiveDashboardTab()` in `MainBottomBar.tsx`: **Scout** for `/scout`, `/traffic-*`, `/motorway-status/*`; **Association** for `/association`, `/news`, `/casework`, `/library`, `/polls`, `/chat`, `/member-e-card`; **Home** for everything else (e.g. `/`, `/profile`, `/docs-vault`, `/more`, `/earnings-calc`).
- **Global header:** `AppHeader` above the stack: left = logo + “PHD MATRIX” (tap → `/`); **right = “Admin Panel”** → `/admin` **only** when `memberStatus.isAdmin` (from `members.is_admin`, after load). Non-admins see no control there.
- **Stack content:** `(tabs)/_layout.tsx` wraps an Expo Router **`Stack`** (not `expo-router/ui` headless tabs). Nested folders (e.g. `news/`, `admin/`) keep their own layouts.
- **Tab screen headers:** Hub screens have no `TabScreenHeader`; other screens use `TabScreenHeader` with a single title.
- **Home hub (`index.tsx`):** (1) **Membership status** GlassCard (sleek + gradient border when active). (2) **Your PHD Matrix** frosted menu (Profile, Docs Vault only; 2-column grid).
- **Scout hub (`scout.tsx`):** (1) **Glasgow Roads Alerts** — same Renfrew Bridge + Command Center behaviour as before (`useBridgeBanner`, **60s** tick, `getBridgeBannerDisplay`, `computeMotorwayStatuses`, `CommandCenterTiles`). (2) **Upcoming Events** — same 8-tile banner UI as before (`UpcomingEventsCard`, `useGlasgowEventsBanner`, venue order from `events-supabase`). (3) **Glasgow Traffic Data** menu (incidents, roadworks, journey times, flows, VMS).
- **Association hub (`association.tsx`):** **Association Members Only** dashboard — News, Casework, Library, Polls, Member E-Card, Coming Soon (all premium except the tab itself is visible to everyone); starred premium icons; non-active users get `AssociationMembershipModal` instead of navigation. Chat visibility via `mobile/constants/features.ts`. The Association tab is reachable by **all** signed-in users.
- **Other screens:** Each uses `View` → `TabScreenHeader` → `ScrollView` (or list) with content.

---

## 5. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, membershipStatus, etc. Single object per device (profile is saved/edited in the app; membership status comes from Supabase).
- **MemberStatus** (`context/MemberContext`): `isActive` (membership_status = `active`), `membershipStatus` (active/expired/pending), `isChatModerator`, and `isAdmin` (from `members.is_admin`).
- **Casework:** Tickets with messages, status flow, attachments. Member side implemented; admin sets status and replies.
- **News, Library:** CMS articles in Supabase `cms_posts` (see **5b**). One table; `type` = 'news' | 'library'. Admin (or Table Editor) inserts rows; app shows list tiles and full article on tap.
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

**5b. CMS (News, Library)**

- **Schema:** `docs/cms-schema.sql` defines `cms_posts` (id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at). **`is_front_page_announcement`** (boolean) pins **news** posts to the **signed-in home** dashboard for all members; add/align with `docs/cms-front-page-announcement-migration.sql` if the column is missing. Run base schema in Supabase SQL Editor once. Existing projects that still have `campaign` in the type check: run `docs/cms-remove-campaign-migration.sql`.
- **Supabase (admin RLS):** In-app news publishing/editing uses **`insertCmsNewsPost`**, **`updateCmsNewsPost`**, and **`setCmsPostFrontPageAnnouncement`** in `lib/cms-supabase.ts` (requires policies that allow `is_admin` members to write `cms_posts`; confirm in Supabase). **Library** articles can still be maintained via Table Editor or future admin UI (`type = 'library'`).
- **In-app News admin:** **`/admin/news`** — landing lists articles (pull-to-refresh); cyan **Create News Article** → **`/admin/news/create`**; row tap → **`/admin/news/[id]`** to edit title/body/excerpt and the **Show on home dashboard** switch (no per-row toggles on the list). Uses **`NewsArticleEditor`** + **`useNews().refreshPosts`** after saves.
- **Member app:** News hub (`NewsContext` + **`news/index`** + **`news/[id]`**) — same routes as before, distinct from **`admin/news/*`**. Library (`library/index` + `library/[id]`) uses `fetchCmsPosts(supabase, 'library')` and `fetchCmsPostById`. Shared **`CmsPostTile`** and **`ArticleDetailContent`**. Home announcement tiles use **`fetchFrontPageAnnouncementPosts`** where implemented.

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

- **Home hub:** Membership status card + **Your PHD Matrix** menu only.
- **Scout hub:** Glasgow Roads Alerts (Renfrew Bridge + Command Center M8/M80/M74/M73) + **Upcoming Events** 8-tile banner + **Glasgow Traffic Data** menu.
- **Association hub:** **Association Members Only** dashboard tiles; premium icons are starred and membership-gated via the Association Membership modal (non-active users see the modal; active users navigate normally). **News** list shows **news** CMS posts only; article detail uses `/news/[id]`. Tab visible to all signed-in users.
- **Profile:** MembershipCard + form + Save.
- **Casework:** List, New request, ticket detail with thread and reply.
- **News:** List + detail with tappable URLs.
- **Polls:** Open/Closed lists; take poll; thank-you; results when closed.
- **Chat:** Messages, quote, reactions, Realtime, mod actions; keyboard handling.
- **Traffic (Glasgow Roads Alerts):** Renfrew Bridge on **Scout** with **scheduled-closure** handling (scraper + `getBridgeBannerDisplay` + 60s tick via `useBridgeBanner`); Command Center tiles show **“n Alert(s)”** when problems; traffic-incidents, traffic-current-roadworks, traffic-future-roadworks (list + detail); traffic-journey-times, traffic-flows, traffic-vms-signs screens; motorway-status/[code] for per-motorway situations. TrafficContext (situations, refresh, getSituation); TrafficProvider in root layout. All traffic tables are populated by the **traffic-receiver Supabase Edge Function** (no GitHub-based receiver).
- **Glasgow events banner (Scout):** **`mobile/components/home/UpcomingEventsCard.tsx`** (used from **`mobile/app/(tabs)/scout.tsx`**) — gig row + fixture grid. Reads `public.glasgow_events` via **`mobile/lib/events-supabase.ts`** (`fetchGlasgowEventsForBanner`) and **`mobile/hooks/useGlasgowEventsBanner.ts`**. Types: **`mobile/types/events.ts`** (`GlasgowVenueKey`, `GlasgowEventBannerRow` with `homeTeam`/`awayTeam`). Venue constants: **`GLASGOW_EVENT_VENUE_ORDER`** (fetch/upsert set), **`GLASGOW_GIG_VENUE_ORDER`**, **`GLASGOW_FIXTURE_VENUE_ROWS`**. Schema: **`docs/supabase-schema.sql`** (`glasgow_events`). Populated by Edge Functions **`ticketmaster-events`** and **`sportsdb-events`**. **Writes use PostgREST `fetch` upserts** (`supabase/functions/_shared/glasgow-events-upsert.ts`), not `supabase-js` upsert, to avoid Edge runtime bugs (`reading 'error'`). **Ticketmaster:** strict **spike rate limit** — env `TICKETMASTER_MIN_INTERVAL_MS` (default **450**) between Discovery calls + **429 retries**; optional `TICKETMASTER_DAYS_AHEAD`. **Sports:** `eventsround` window + TheSportsDB pacing/429 retries; per-request failures are **non-fatal** (warnings collected, run continues). **Response is HTTP 200** with JSON `{ ok, sportsdbEventsUpserted, warnings?, error? }` — read **`ok` and `error`** (true failure = missing secrets or DB upsert failed); **`warnings`** = skipped rounds / API flakes. Rare **500** = crash in the outer handler only.
- **Auth + membership gating:** Supabase email code login. Signed-in users always reach the main app (paywall removed; `NotActiveScreen` is legacy/unused). Membership status drives: status card UI + push token registration (only for active members) + premium feature access. Premium screens (News, Casework, Library, Polls, Member E-Card) are wrapped with `AssociationMembershipGate` where applicable, which shows the “Association Membership” modal and blocks access for non-active members (including deep links). Also note: `AuthContext` validates that the Supabase auth user still exists; if the auth user was deleted server-side, the app clears the session and returns to sign-in.
- **Admin (in-app shell):** **`/admin`** — `AdminAccessGate` wraps **`admin/_layout.tsx`** (Stack). On focus, **`fetchMemberAdminFlag`** (`lib/member-supabase.ts`); if not admin, **`router.replace('/')`**. **Admin hub** (`admin/index.tsx`): **`AdminAreaHeader`** (“Admin systems”, no back row) + four **GlassCard** tiles → News, Casework, Polls & Surveys, Membership. **News System** — nested **`admin/news/`** Stack: **landing** (`index`) = cyan **Create News Article** + glass **Articles** list (pull-to-refresh; tap row → edit); **`create`** = **`NewsArticleEditor`** + **`insertCmsNewsPost`**; **`[id]`** = edit + **`updateCmsNewsPost`** + **Show on home dashboard** switch (only on edit screen, not list). **Casework admin** — cyan **Manually Create a Casework Record** (placeholder) + **Active Cases** / **Closed Cases** glass panels. **Polls & Surveys** — Polls/Surveys pills, cyan create tiles (placeholders), glass Active/Closed lists (**`usePolls()`** for polls). **Membership** — four pills + placeholder panel. Subpages use **`AdminSubpageScaffold`** + optional custom **`onBackPress`** / **`backLabel`** (e.g. **← News System**). **`AppHeader`** shows **Admin Panel** when `memberStatus.isAdmin`. **Hardening:** profile `upsert` omits `is_admin`; enforce **CMS** and admin writes with Supabase RLS (`docs/supabase-schema.sql`).
- **Sign-in UI:** `SignInScreen` uses updated copy (“Sign in or register with your email address…”), and the “Send code” button styling is solid cyan (no purple gradient).
- **Expo Go:** `npx expo start` from `mobile/`. Use Command Prompt on Windows if PowerShell has script policy issues.

---

## 9. What is NOT done (future work)

- **Traffic:** Travel times, traffic status, and VMS tables are populated by the **traffic-receiver Supabase Edge Function**; confirm which screens show real data vs placeholders and enhance as needed. Bridge status depends on the `renfrew-bridge-status` Edge Function being deployed and run on a schedule.
- **Other tabs:** events-gigs, events-sport, events-other, Earnings Calc, Library, Docs Vault — flesh out as needed.
- **Backend / API:** Supabase for auth + members + chat; no full API layer or GoCardless integration yet.
- **Admin:** **News** publishing/editing is implemented in-app; **casework / polls / membership** admin screens are mostly **UI framework** (see §8). Remaining: wire data + actions, **RLS** for CMS if not already deployed. Promote admins: `members.is_admin = true` in Supabase; default **false**.
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
2. **Other tabs:** Add real content for events-*, Earnings Calc, Library, Docs Vault, Member E-Card.
3. **Snagging:** Polish touch targets, readability, layout.
4. **Backend design:** API and schema for member, casework, polls (news CMS already wired in app + Supabase).
5. **Admin:** Wire **casework** admin (manual create, active/closed lists); **polls/surveys** create flows; **membership** segment data; verify **CMS** RLS for `insert`/`update`/`is_front_page_announcement` for admins only.
6. **Notifications:** Push or in-app for casework and expiry reminders.
7. **Subscriptions:** GoCardless + backend driving membership status in Supabase.

---

## 13. Quick reference for the next agent

- **Member:** `useMember()` from `@/context/MemberContext`; `saveMember(profile)`; `memberStatus.isAdmin` from `getMemberWithStatus` / `members.is_admin`.
- **Admin route:** `AdminAccessGate` + `fetchMemberAdminFlag(supabase, userId)`; `router.push('/admin' as Href)` from **`AppHeader`** when `isAdmin`. Nested news admin: **`/admin/news`**, **`/admin/news/create`**, **`/admin/news/[id]`** (typed routes may require `as Href` on literals until regenerated). **Admin components:** `AdminAreaHeader`, `AdminSubpageScaffold`, `NewsArticleEditor`. **CMS admin API:** `insertCmsNewsPost`, `updateCmsNewsPost`, `setCmsPostFrontPageAnnouncement`, `fetchCmsPosts`, `fetchCmsPostById`, `fetchFrontPageAnnouncementPosts` from `@/lib/cms-supabase`.
- **Association membership gating:** `AssociationMembershipGate` wraps premium screens (News, Casework, Library, Polls, Member E-Card) and shows `AssociationMembershipModal` for non-active members; **Association hub** tiles use the same modal + `memberStatus.isActive` to decide navigation.
- **Casework:** `useCasework()`; `createTicket(...)`; `addMessage(ticketId, 'member', text)`.
- **News (members):** `useNews()`; `posts` (type `news` only); `getPost(id)` from cache. **`(tabs)/news/index.tsx`** list + **`(tabs)/news/[id]`** detail. **News (admins):** **`(tabs)/admin/news/*`** — separate routes; do not confuse with member **`/news/[id]`**. **Library:** `fetchCmsPosts(supabase, 'library')` in library screens. Shared: `CmsPostTile`, `ArticleDetailContent`. Schema: `docs/cms-schema.sql`, `docs/cms-front-page-announcement-migration.sql` (if needed).
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` after close.
- **Chat:** `useChat()`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods).
- **Traffic:** `useTraffic()` from `@/context/TrafficContext`; `situations`, `refresh`, `getSituation(id)`. `computeMotorwayStatuses(situations)` from `@/lib/traffic-status` for Command Center tiles; UI in `CommandCenterTiles` (**n Alert(s)** / ALL OK). Bridge: `useBridgeBanner()` (`@/hooks/useBridgeBanner`) uses `fetchBridgeStatus` + `getBridgeBannerDisplay` (uses `next_closure_*` instants vs device time). **Scout:** 60s interval in the hook so the bridge pill updates across closure boundaries without leaving the screen.
- **Theme:** `useThemeColor(...)`; `Spacing`, `Radius`, `FontSize`, `NeoGlass`, `NeoText` from `@/constants/theme`. Glass: `GlassCard` with `sleek`, `gradientBorder`; `FrostedGlassView` with `intensity`, `overlayColor`.
- **Routing:** `router.push('/')` (Home hub); `router.push('/scout')`, `router.push('/association')`; `router.push('/profile')`, `router.push('/chat')`, `router.push('/casework')`, `router.push('/news')`, `router.push('/polls')`, `router.push('/more')`; **`router.push('/admin')`**, **`/admin/news`**, **`/admin/news/create`**, **`/admin/news/${id}`**, **`/admin/casework`**, **`/admin/polls`**, **`/admin/membership`** (use `as Href` if TypeScript complains); `router.push('/events-gigs')`, `router.push('/events-sport')`, `router.push('/events-other')`; `router.push('/traffic-incidents')`, `router.push('/traffic-current-roadworks')`, `router.push('/traffic-future-roadworks')`, `router.push('/traffic-journey-times')`, `router.push('/traffic-flows')`, `router.push('/traffic-vms-signs')`, `router.push(\`/motorway-status/${code}\`)` (e.g. M8, M80, M74, M73); `router.push('/earnings-calc')`, `router.push('/library')`, `router.push('/docs-vault')`, `router.push('/member-e-card')`; `router.push(\`/casework/${id}\`)`, etc.
- **Header / layout:** `AppHeader` (optional top-right **Admin Panel** for admins), `MainBottomBar` (fixed hub nav), `TabScreenHeader` on inner tab screens; **`AdminAreaHeader`** / **`AdminSubpageScaffold`** under **`/admin`**.
- **Git:** **main** = source of truth. Use feature branches for new work; merge to main when ready.
- **Traffic receiver:** `scripts/traffic-receiver/`; `.env` with Traffic Scotland + Supabase keys; `node index.js`. Schema: `docs/traffic-schema.sql`. Guide: `docs/traffic-receiver.md`. Bridge: `docs/renfrew-bridge-status.md`.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
