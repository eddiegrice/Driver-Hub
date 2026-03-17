# PHD Matrix App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `handoff.md` in the project root.

**For the next agent (quick orientation):** **main** is the source of truth and is up to date with all work, including **Glasgow Roads Alerts** (bridge status, motorway tiles, command center). Create new branches from main: `git checkout main && git pull origin main && git checkout -b <name>`. App: Expo SDK 54, React Native, Supabase auth + members + chat. **Home** = status card + **Glasgow Roads Alerts** card (Renfrew Bridge status + Command Center 2×2 motorway tiles M8/M80/M74/M73) + **four menu boxes**: Your PHD Matrix; PHD Matrix: Collective Association (Campaigns, News, Casework, Library, Petitions, Polls — Chat Room and Earnings Calc are not in the menu for this version; see `constants/features.ts` to re-enable Chat). Design: dark theme, purple gradient background, smoked glass (0.03 overlay, blur 12), etched borders (0.1), Active pill #00CCFF. Code lives in `mobile/`. **Traffic:** `TrafficProvider` + `useTraffic()` (situations from `traffic_situations`); home uses `computeMotorwayStatuses(situations)` for tiles and `fetchBridgeStatus(supabase, 'renfrew_bridge')` for bridge. **Traffic Scotland receiver now runs as a Supabase Edge Function** at `supabase/functions/traffic-receiver/index.ts` (no GitHub workflow); legacy Node script remains at `scripts/traffic-receiver/` as a reference only. Schema in `docs/traffic-schema.sql` (includes `bridge_status`). Tabs: traffic-incidents, traffic-current-roadworks, traffic-future-roadworks, traffic-journey-times, traffic-flows, traffic-vms-signs, motorway-status/[code].

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
│       ├── index.tsx        # Home: status GlassCard + Glasgow Roads Alerts + four menu boxes (Your PHD Matrix; Collective: Campaigns, News, Casework, Library, Petitions, Polls; Glasgow Traffic Data; Glasgow Events Data). Chat/Earnings Calc hidden via constants/features.ts.
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
│   ├── CommandCenterTiles.tsx   # 2×2 motorway tiles (M8, M80, M74, M73); red/green status; tap → motorway-status/[code]
│   ├── CmsPostTile.tsx          # Shared article tile (title, date, excerpt, optional thumbnail) for News/Campaigns/Library
│   ├── ArticleDetailContent.tsx # Shared full-article body (title, meta, body with clickable URLs)
│   ├── parallax-scroll-view.tsx
│   ├── themed-text.tsx
│   ├── themed-view.tsx
│   ├── auth/
│   │   ├── SignInScreen.tsx
│   │   └── NotActiveScreen.tsx
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
│   ├── traffic-status.ts     # computeMotorwayStatuses(situations) → MotorwayStatus[] (M8, M80, M74, M73)
│   └── push-device-supabase.ts
└── types/
    ├── member.ts
    ├── casework.ts
    ├── cms.ts        # CmsPost, CmsPostType (news | campaign | library)
    ├── news.ts       # Legacy NewsPost; News uses CmsPost from CMS
    ├── polls.ts
    ├── chat.ts
    ├── traffic.ts    # TrafficSituation
    └── bridge.ts     # BridgeStatus (id, name, status: 'open'|'closed'|'unknown', etc.)
```

**Removed / legacy:** `DashboardMenuBar.tsx`, `DashboardMenuTabBar.tsx` (no longer in codebase). `GlassTabBar.tsx`, `haptic-tab.tsx` exist but are legacy/unused. There is no single `traffic-alerts.tsx`; traffic is split into traffic-incidents, traffic-current-roadworks, traffic-future-roadworks, traffic-journey-times, traffic-flows, traffic-vms-signs, and motorway-status/[code].

---

## 4. Navigation and layout (current)

- **No bottom tab bar.** The home screen **is** the main menu.
- **Global header (every tab):** `AppHeader` at the top of `(tabs)/_layout.tsx`: left = logo + “PHD MATRIX”; right = “Home” button. Logo, title, and Home navigate to `/`.
- **Tab content:** Below the header, `TabSlot` renders the active route. Routes are switched by navigating from home menu tiles or header.
- **Tab screen headers:** Every tab except home uses `TabScreenHeader` with a single title.
- **Home screen content (top to bottom):** (1) **Status card** (GlassCard, sleek + gradient border when active). (2) **Glasgow Roads Alerts** card: header “Glasgow Roads Alerts”, **Renfrew Bridge** banner (OPEN / CLOSED / Status unavailable from `bridge_status`), then **Command Center** 2×2 tiles (M8, M80, M74, M73) with red/green status from `computeMotorwayStatuses(situations)`; tap tile → `/motorway-status/[code]`. (3) **Four menu boxes:** Your PHD Matrix (Profile, Docs Vault, Member E-Card); PHD Matrix: Collective Association (Campaigns, News, Casework, Library, Petitions, Polls — Chat Room and Earnings Calc not in menu this version); Glasgow Traffic Data (Incidents, Current Roadworks, Future Roadworks, Journey Times, Traffic Flows, VMS Signs); Glasgow Events Data (Gigs & Shows, Sport Events, Other Events). (4) No announcement boxes in current home layout.
- **Other tab screens:** Each uses `View` → `TabScreenHeader` → `ScrollView` (or list) with content.

---

## 5. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, membershipStatus, etc. Single object per device.
- **Casework:** Tickets with messages, status flow, attachments. Member side implemented; admin sets status and replies.
- **News, Campaigns, Library:** CMS articles in Supabase `cms_posts` (see **5b**). One table; `type` = 'news' | 'campaign' | 'library'. Admin (or Table Editor) inserts rows; app shows list tiles and full article on tap.
- **Polls:** Poll with questions/options; members answer only. Results visible when closed.
- **Chat:** Single global room; messages, reactions, Realtime; mod actions. See `docs/supabase-schema.sql`.
- **Traffic:** `TrafficSituation` (`types/traffic.ts`) from Supabase `traffic_situations`. `BridgeStatus` (`types/bridge.ts`): id, name, status ('open'|'closed'|'unknown'), current_message, next_closure_*, updated_at.

**5a. Traffic Scotland and bridge — tables and receiver (updated)**

- **Schema:** `docs/traffic-schema.sql` defines: `traffic_situations`, `traffic_travel_times`, `traffic_travel_time_sites`, `traffic_traffic_status`, `traffic_traffic_status_sites`, `traffic_vms`, `traffic_vms_table`, **`bridge_status`**. All have RLS (authenticated read).
- **Receiver (current):** Supabase Edge Function at `supabase/functions/traffic-receiver/index.ts`. Fetches all Traffic Scotland DATEX II publications (UnplannedEvents, CurrentRoadworks, FutureRoadworks, TravelTimeData, TravelTimeSites, TrafficStatusData, TrafficStatusSites, VMS, VMSTable) and upserts into **all** traffic tables: `traffic_situations`, `traffic_travel_times`, `traffic_travel_time_sites`, `traffic_traffic_status`, `traffic_traffic_status_sites`, `traffic_vms`, `traffic_vms_table`. Runs on a Supabase schedule (pg_cron / Edge Function cron) every ~15 minutes; **no GitHub Actions** are used for this receiver anymore. Legacy Node script at `scripts/traffic-receiver/index.js` remains as a reference.
- **Bridge status:** Table `bridge_status` (id, name, status, current_message, next_closure_*, updated_at). App calls `fetchBridgeStatus(supabase, 'renfrew_bridge')` in `lib/bridge-supabase.ts`. Home displays OPEN / CLOSED / Status unavailable. A separate Supabase Edge Function (`supabase/functions/renfrew-bridge-status/index.ts`) is responsible for scraping and updating this table on a schedule.
- **Motorway status on home:** Derived from `traffic_situations` via `computeMotorwayStatuses(situations)` in `lib/traffic-status.ts`. Supports M8, M80, M74, M73; each tile shows “Problems” (red) or “Clear” (green) based on active situations for that road.
- **Run receiver locally:** See `docs/traffic-receiver.md`. Bridge status: deploy and invoke Supabase function per `docs/renfrew-bridge-status.md`.
- **App today:** Home shows bridge status + Command Center motorway tiles. Traffic tab group: incidents, current/future roadworks (list + detail from situations), journey-times, flows, VMS screens; motorway-status/[code] shows situations for that motorway. Travel times, traffic status, and VMS **data** are in the DB; UI for journey-times/flows/VMS may be placeholder or partial — confirm in code.

**5b. CMS (News, Campaigns, Library)**

- **Schema:** `docs/cms-schema.sql` defines `cms_posts` (id, type, title, body, excerpt, thumbnail_url, author_name, published_at, created_at, updated_at). Run in Supabase SQL Editor once. RLS: authenticated read; write via service role (admin panel later).
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

- **Home:** Status card + Glasgow Roads Alerts card (Renfrew Bridge status + Command Center M8/M80/M74/M73 tiles) + five menu boxes. Navigation via tiles and Home/logo.
- **Profile:** MembershipCard + form + Save.
- **Casework:** List, New request, ticket detail with thread and reply.
- **News:** List + detail with tappable URLs.
- **Polls:** Open/Closed lists; take poll; thank-you; results when closed.
- **Chat:** Messages, quote, reactions, Realtime, mod actions; keyboard handling.
- **Traffic (Glasgow Roads Alerts):** Bridge status on home; Command Center tiles with motorway status; traffic-incidents, traffic-current-roadworks, traffic-future-roadworks (list + detail); traffic-journey-times, traffic-flows, traffic-vms-signs screens; motorway-status/[code] for per-motorway situations. TrafficContext (situations, refresh, getSituation); TrafficProvider in root layout. All traffic tables are populated by the **traffic-receiver Supabase Edge Function** (no GitHub-based receiver).
- **Auth + membership gate:** Supabase email code login. NotActiveScreen if not active. Refresh status button.
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
- **Casework:** `useCasework()`; `createTicket(...)`; `addMessage(ticketId, 'member', text)`.
- **News:** `useNews()`; `posts` (CmsPost[] from Supabase), `getPost(id)`; list/detail from `cms_posts` type=news. **Campaigns/Library:** fetch via `fetchCmsPosts(supabase, 'campaign'|'library')`, detail `fetchCmsPostById(supabase, id)`. Shared: `CmsPostTile`, `ArticleDetailContent`. Schema: `docs/cms-schema.sql`.
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` after close.
- **Chat:** `useChat()`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods).
- **Traffic:** `useTraffic()` from `@/context/TrafficContext`; `situations`, `refresh`, `getSituation(id)`. `computeMotorwayStatuses(situations)` from `@/lib/traffic-status` for Command Center tiles. Bridge: `fetchBridgeStatus(supabase, 'renfrew_bridge')` from `@/lib/bridge-supabase`.
- **Theme:** `useThemeColor(...)`; `Spacing`, `Radius`, `FontSize`, `NeoGlass`, `NeoText` from `@/constants/theme`. Glass: `GlassCard` with `sleek`, `gradientBorder`; `FrostedGlassView` with `intensity`, `overlayColor`.
- **Routing:** `router.push('/')` (home); `router.push('/profile')`, `router.push('/chat')`, `router.push('/casework')`, `router.push('/news')`, `router.push('/polls')`, `router.push('/more')`; `router.push('/campaigns')`, `router.push('/events-gigs')`, `router.push('/events-sport')`, `router.push('/events-other')`; `router.push('/traffic-incidents')`, `router.push('/traffic-current-roadworks')`, `router.push('/traffic-future-roadworks')`, `router.push('/traffic-journey-times')`, `router.push('/traffic-flows')`, `router.push('/traffic-vms-signs')`, `router.push(\`/motorway-status/${code}\`)` (e.g. M8, M80, M74, M73); `router.push('/earnings-calc')`, `router.push('/library')`, `router.push('/petitions')`, `router.push('/docs-vault')`, `router.push('/member-e-card')`; `router.push(\`/casework/${id}\`)`, etc.
- **Header / layout:** `AppHeader`, `TabScreenHeader` in `components/`. No bottom bar; home is the main menu.
- **Git:** **main** = source of truth. Use feature branches for new work; merge to main when ready.
- **Traffic receiver:** `scripts/traffic-receiver/`; `.env` with Traffic Scotland + Supabase keys; `node index.js`. Schema: `docs/traffic-schema.sql`. Guide: `docs/traffic-receiver.md`. Bridge: `docs/renfrew-bridge-status.md`.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
