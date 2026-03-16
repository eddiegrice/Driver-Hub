# PHD Matrix App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `handoff.md` in the project root.

**For the next agent (quick orientation):** **main** is the source of truth and is up to date. Current feature branch for new work is **traffic** (Traffic Alerts). Create new branches from main: `git checkout main && git pull origin main && git checkout -b <name>`. App: Expo SDK 54, React Native, Supabase auth + members + chat. Home = status card + single glass menu (sections + tiles) + two announcement boxes. Design: dark theme, purple gradient background, smoked glass (0.03 overlay, blur 12), etched borders (0.1), Active pill #00CCFF. Code lives in `mobile/`. **Traffic Scotland:** Receiver in `scripts/traffic-receiver/` fetches all DATEX II feeds and writes to Supabase; schema in `docs/traffic-schema.sql`. App Traffic Alerts tab currently reads only `traffic_situations`; other tables (travel times, traffic status, VMS + locations) are populated but not yet displayed.

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

**Branching:** **main** is the source of truth and is up to date with all features (Chat, new tabs, sleekness UI). New work is done on feature branches created from main (e.g. `traffic` for Traffic Alerts). Always create new branches from latest main: `git checkout main && git pull origin main && git checkout -b <branch-name>`.

---

## 2. Tech stack (current)

- **Framework:** Expo ~54, React 19, React Native 0.81  
- **Routing:** expo-router (file-based). Tabs + nested stacks.  
- **Auth:** Supabase email **code** login (passwordless). Supabase JS client configured in `lib/supabase.ts`; auth context in `context/AuthContext.tsx`; sign-in UI in `components/auth/SignInScreen.tsx`.  
- **Backend data:** Supabase Postgres (project already created) with a `members` table as per `docs/supabase-schema.sql`. Member profile + membership status are loaded/saved via `lib/member-supabase.ts`. Chat uses Supabase tables `chat_messages`, `chat_reactions`, `chat_room_state`, etc. (see `docs/supabase-schema.sql`) and Realtime; see `lib/chat-supabase.ts`. **Traffic Scotland data** uses separate tables (see §5a and `docs/traffic-schema.sql`); receiver script in `scripts/traffic-receiver/` populates them on a schedule or when run locally.  
- **State / data on device:** AsyncStorage is still used for some local storage:
  - **AsyncStorage** keys: `@driverhub_member`, `@driverhub_casework`, `@driverhub_news`, `@driverhub_news_seeded`, `@driverhub_polls`, `@driverhub_poll_responses`, `@driverhub_polls_seeded`, `@driverhub_poll_results_<pollId>`
- **Contexts (providers):** In `app/_layout.tsx` order: `ThemeProvider` → `SafeAreaProvider` → `MemberProvider` → `CaseworkProvider` → `NewsProvider` → `PollsProvider` → `ChatProvider` (if present) → `Stack`. Do not reorder without checking dependencies.
- **Path alias:** `@/` points to project root (e.g. `@/context/MemberContext`, `@/types/member`, `@/constants/theme`).

**Critical dependency:** `react-native-screens` is **pinned to 4.16.0** in `package.json`. Versions 4.17+ cause a crash on Expo SDK 54 + Expo Go: `java.lang.String cannot be cast to java.lang.Boolean`. Do not upgrade it without testing on a real device/Expo Go.

---

## 3. App structure (file-based routes)

```
mobile/
├── app/
│   ├── _layout.tsx          # Root: GradientPortalBackground (fixed), ThemeProvider, SafeAreaProvider, Stack
│   ├── modal.tsx            # Placeholder modal (expo-router)
│   └── (tabs)/
│       ├── _layout.tsx      # No bottom tab bar. AppHeader (logo + PHD MATRIX + Home) then TabSlot. Hidden TabList for all routes.
│       ├── index.tsx        # Home: status GlassCard + single glass menu container (sections "PHD Matrix Menu" / "Your PHD Matrix") + two announcement boxes (Announcements, What's On)
│       ├── profile.tsx      # Profile: TabScreenHeader "Profile" + MembershipCard + editable form, Save
│       ├── chat.tsx         # Chat Group: TabScreenHeader + glass box (messages) + quote bar + composer; keyboard via marginBottom
│       ├── more.tsx         # More: TabScreenHeader "More" + placeholder
│       ├── traffic-alerts.tsx   # Traffic Alerts (branch traffic for current work)
│       ├── local-events.tsx    # Local Events
│       ├── earnings-calc.tsx   # Earnings Calc
│       ├── library.tsx        # Library
│       ├── petitions.tsx      # Petitions
│       ├── docs-vault.tsx      # My Docs Vault
│       ├── member-e-card.tsx  # Member E-Card
│       ├── casework/
│       │   ├── _layout.tsx  # Stack for casework
│       │   ├── index.tsx    # TabScreenHeader "Casework" + list of tickets + "New request"
│       │   ├── new.tsx      # New request form (type, subject, message, photo attach)
│       │   └── [id].tsx    # Ticket detail: messages thread, reply input, attachments
│       ├── news/
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # TabScreenHeader "News & Updates" + list of posts
│       │   └── [id].tsx     # Post detail; body has tappable URLs (regex-detected)
│       └── polls/
│           ├── _layout.tsx
│           ├── index.tsx    # TabScreenHeader "Polls" + Open / Closed polls
│           └── [id].tsx     # Take poll (if open) / Thank you (if responded) / Results (if closed)
├── components/
│   ├── GradientPortalBackground.tsx  # Fixed purple gradient background (used in root _layout)
│   ├── AppHeader.tsx        # Global header: logo (left) + "PHD MATRIX" (pressable → home) + Home button (right)
│   ├── TabScreenHeader.tsx  # Unified tab title: two faint lines + title (subtitle size, semibold)
│   ├── FrostedGlassView.tsx # Glass: expo-blur (intensity 20 default) + overlay (0.07 default). Optional intensity + overlayColor for "smoked glass" (e.g. 12, rgba(255,255,255,0.03)).
│   ├── MembershipCard.tsx   # Premium card (accent strip, name, membership no, status pill #00CCFF when active, expiry)
│   ├── parallax-scroll-view.tsx  # Legacy; tab screens use ScrollView + TabScreenHeader
│   ├── themed-text.tsx      # FontSize, LineHeight; title/subtitle semibold (600)
│   ├── themed-view.tsx
│   └── ui/
│       ├── Card.tsx         # Legacy
│       ├── GlassCard.tsx    # FrostedGlassView + 1px border (NeoGlass.cardBorder 0.1). Optional gradientBorder (Active), sleek (smoked glass), borderRadius, borderColor, contentStyle.
│       ├── PrimaryButton.tsx
│       └── icon-symbol.tsx  # SF Symbol → MaterialIcons mapping for Android
├── constants/
│   └── theme.ts             # NeoBase, NeoGlass (cardBorder 0.1 etched), NeoText, NeoAccent, Spacing, Radius, FontSize, etc.
├── context/
│   ├── MemberContext.tsx    # useMember(): member, isLoading, setMember, saveMember
│   ├── CaseworkContext.tsx  # useCasework(): tickets, getTicket, createTicket, addMessage, setTicketStatus
│   ├── NewsContext.tsx      # useNews(): posts, getPost, refreshPosts
│   ├── PollsContext.tsx     # usePolls(): polls, openPolls, closedPolls, getPoll, getMyResponse, submitResponse, getResults
│   └── ChatContext.tsx      # useChat(): messages, sendMessage, addReaction, deleteMessage (mod), etc.
├── hooks/
│   ├── use-color-scheme.ts
│   └── use-theme-color.ts   # useThemeColor(props, 'text'|'tint'|'background'|'surface'|'border'|'textMuted' etc.)
├── lib/
│   ├── member-storage.ts    # getStoredMember, setStoredMember
│   ├── casework-storage.ts  # getStoredTickets, addTicket, updateTicket, addMessageToTicket
│   ├── news-storage.ts      # getStoredPosts, setStoredPosts, ensureSeeded
│   ├── polls-storage.ts     # getStoredPolls, getStoredResponses, addResponse, getMyResponse, getStoredResults, setStoredResults, ensurePollsSeeded
│   └── chat-supabase.ts     # loadMessages, sendMessage, addReaction, deleteMessage, subscribeRoom, getRoomState
└── types/
    ├── member.ts    # MemberProfile, emptyMemberProfile, formatDateForDisplay
    ├── casework.ts  # CaseworkTicket, CaseworkMessage, CaseworkAttachment, CaseworkStatus, CaseworkType, statusLabel
    ├── news.ts      # NewsPost
    ├── polls.ts     # Poll, PollQuestion, PollOption, PollResponse, PollAnswer, PollResults, isPollOpen, isPollClosed
    └── chat.ts      # ChatMessage, ChatReaction, etc.
```

**Removed components (no longer in codebase):** `DashboardMenuBar.tsx`, `DashboardMenuTabBar.tsx` (bottom nav was removed; home is the main menu). `GlassTabBar.tsx` and `haptic-tab.tsx` exist but are legacy/unused.

---

## 4. Navigation and layout (current)

- **No bottom tab bar.** The home screen **is** the main menu.
- **Global header (every tab):** `AppHeader` at the top of `(tabs)/_layout.tsx`: left = logo placeholder (white circle, cyan #00ccff border) + “PHD” (superheavy) + “MATRIX” (light, caps). Right = “Home” button (house icon + label). **Logo and title are pressable** and call `router.push('/')` when not already on home. **Home button** does the same.
- **Tab content:** Below the header, `TabSlot` renders the active route. Routes are switched by navigating (e.g. from home menu tiles via `router.push('/news')`, and back via Home/logo).
- **Tab screen headers:** Every tab except home uses `TabScreenHeader` with a single title (e.g. “Chat Group”, “News & Updates”, “Profile”, “Casework”, “Polls”, “More”). Design: two faint horizontal lines (NeoGlass.stroke) with the title between them; font subtitle size, semibold; extra padding above/below text.
- **Home screen content:** Status card (GlassCard, sleek + gradient border when active), then a **single scrollable glass container** with two sections: “PHD Matrix Menu” (Casework, Chat, Earnings Calc, Library, Local Events, Petitions, Polls, Traffic Alerts, Trade News) and “Your PHD Matrix” (My Profile, My Docs Vault, Member E-Card). Below that, **two side-by-side glass boxes**: Announcements and What’s On. No bottom bar.
- **Other tab screens:** Each uses `View` → `TabScreenHeader` → `ScrollView` with content; consistent padding; no ParallaxScrollView.

---

## 5. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, badgeExpiry, vehicleRegistration, vehicleMake, vehicleModel, plateNumber, plateExpiry, membershipNumber, membershipStatus ('active'|'expired'|'pending'), membershipExpiry. Single object per device; used for card, casework snapshot, and future expiry reminders.  
- **Casework:** Tickets have id, memberSnapshot (MemberProfile at create time), type, subject, status, createdAt, updatedAt, messages[], attachments[]. Messages have sender ('member'|'admin'), text, createdAt. Status flow: sent_pending → being_reviewed → being_actioned → resolved → closed. Only member side is implemented; admin will set status and reply.  
- **News:** Posts have id, title, body (plain text; URLs made tappable in UI), publishedAt, authorName. Seeded with two sample posts on first run.  
- **Polls:** Poll has id, title, description, startsAt, endsAt, questions[], isAnonymous. Questions: type 'single'|'multiple'|'text', options[]. Members **cannot create** polls; they only answer. **Results are hidden until poll has closed** (endsAt < now). PollResults stored per poll for closed polls (seeded for sample closed poll). Responses stored in `@driverhub_poll_responses`.  
- **Chat:** Single global club room (`main`). Messages: room_id, member_id, display_name, body, quoted_message_id, created_at. Supabase `chat_messages`; Realtime. Reactions; moderators can delete messages and manage bans/room lock. See `docs/supabase-schema.sql`.

**5a. Traffic Scotland (DATEX II) — tables and receiver**

- **Schema:** Run `docs/traffic-schema.sql` in Supabase SQL Editor. Defines: `traffic_situations`, `traffic_travel_times`, `traffic_travel_time_sites`, `traffic_traffic_status`, `traffic_traffic_status_sites`, `traffic_vms`, `traffic_vms_table`. All have RLS (authenticated read).
- **Receiver:** Node script at `scripts/traffic-receiver/index.js`. Fetches from Traffic Scotland (Basic auth) and upserts:
  - **Situations:** UnplannedEvents, CurrentRoadworks, FutureRoadworks → `traffic_situations` (title, description, location, times, type).
  - **Travel times:** TravelTimeData → `traffic_travel_times`; TravelTimeSites → `traffic_travel_time_sites` (site names). Join on `site_id`.
  - **Traffic status:** TrafficStatusData → `traffic_traffic_status` (freeFlow/congested/unknown); TrafficStatusSites → `traffic_traffic_status_sites`. Join on `site_id`.
  - **VMS:** VMS → `traffic_vms` (message_text, time_last_set, vms_working); VMSTable → `traffic_vms_table` (location_name, direction, lat/lon). Join on `vms_id`.
- **Run receiver locally:** From repo root or `scripts/traffic-receiver/`: create `.env` with `TRAFFIC_SCOTLAND_CLIENT_ID`, `TRAFFIC_SCOTLAND_CLIENT_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; then `npm install` and `node index.js`. See `docs/traffic-receiver.md` for full steps and GitHub Actions setup.
- **App today:** Traffic Alerts tab reads only `traffic_situations` (via context/Supabase). Travel times, traffic status, and VMS (and their site/location tables) are in the DB but **not yet displayed**; next step is to decide what to show and in what format.

---

## 6. Design system (Neo-Gradients Glassmorphism, fixed dark)

- **Fixed dark theme:** The app always uses the dark design (no switching with system/phone settings). `useColorScheme()` always returns `'dark'`.
- **Permanent background:** A **purple gradient portal** (blue–purple glow) is the fixed background for the **whole app**. It is rendered once in `app/_layout.tsx` via `GradientPortalBackground`. All screens use a **transparent** theme background so this gradient shows through. Use **containers** (e.g. `GlassCard`, `FrostedGlassView`) for content blocks, not full-screen opaque backgrounds.
- **Glassmorphism (Sleekness prescription):** Default glass: **rgba(255,255,255,0.07)** overlay + **expo-blur** intensity 20. “Smoked glass” (menu, announcements, status card, chat box): overlay **rgba(255,255,255,0.03)**, intensity **10–15** (e.g. 12) so the gradient shows through. Use `FrostedGlassView` with `intensity` and `overlayColor`, or `GlassCard` with `sleek`. All containers: **1px etched border** `NeoGlass.cardBorder` (rgba(255,255,255,0.1)). Active status: **gradient border** `#00ccff` → `#1a0033` via `GlassCard` `gradientBorder`; **Active pill** solid **#00CCFF** background, text **#0F172A**. Section labels (e.g. “PHD MATRIX MENU”): smaller, letterSpacing 2, color rgba(255,255,255,0.5). Menu icons: white (#FFFFFF), shadowColor #00CCFF, shadowRadius 5, shadowOpacity 0.6. Chat bubbles (own): gradient #00CCFF → #040A4B, borderRadius 16, 1px border rgba(255,255,255,0.1).
- **Palette:** Base `#101115`. Portal gradient: `#3D37F2` → `#8930F3`. Glass: `NeoGlass.frostedOverlay`, `cardBorder` (0.1), `surface`, `surfaceElevated`. Text: `NeoText.primary`, `secondary`, `muted`. Accents: `NeoAccent.purple`, `cyan`. `MembershipCardBorderGradient`, `FontWeight.superheavy`, `Fonts.sans` (platform).
- **Containers:** Prefer `GlassCard` (optional `sleek`, `gradientBorder`, `borderRadius`, `borderColor`, `contentStyle`). Legacy `Card` and `PrimaryButton` exist.
- **Typography:** Headings semi-bold (600). `TabScreenHeader`: `FontSize.subtitle`, `FontWeight.semibold`. Section titles: HUD-style (xs, letterSpacing 2, 0.5 white).
- **Spacing / Radius:** `Spacing.*`, `Radius.card` (32), `Radius.lg` (16), etc. in `constants/theme.ts`.

---

## 7. Chat screen — layout and keyboard

- **Title:** “Chat Group” (single line in `TabScreenHeader`). Mod menu (⋮) remains on the right when user is a moderator.
- **Scroll area:** Message list inside a **glassmorphic container** (smoked glass: intensity 12, overlay 0.03). Outer `glassBoxOuter`, inner `glassBox` (1px border, `Radius.lg`, `FrostedGlassView`). **FlatList** scrolls inside; composer and quote bar are below.
- **Composer:** Below the glass box. `paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm` so it sits above the device gesture area. **Keyboard:** The composer uses **marginBottom: keyboardHeight** when the keyboard is open (from `Keyboard.addListener` for `keyboardWillShow` / `keyboardDidShow`). This is the **only** shift applied (no `KeyboardAvoidingView`), so the input moves up by exactly the keyboard height and stays visible with no large gap. Send button has reduced padding (e.g. `Spacing.md` horizontal, `Spacing.sm` vertical, minHeight 36).

---

## 8. What is implemented and working

- **Home (main):** Status card (sleek + gradient border when active) + single glass menu (sections "PHD Matrix Menu" / "Your PHD Matrix" with all tab tiles) + two announcement boxes (Announcements, What's On). Navigation via tiles and Home/logo in header.
- **Profile:** TabScreenHeader “Profile” + MembershipCard + form + Save (AsyncStorage / Supabase).
- **Casework:** TabScreenHeader “Casework” + list of tickets; New request; ticket detail with message thread and reply.
- **News:** TabScreenHeader “News & Updates” + list of posts; detail with tappable URLs.
- **Polls:** TabScreenHeader “Polls” + Open / Closed lists; take poll; thank-you; results when closed.
- **More:** TabScreenHeader “More” + placeholder.
- **Chat:** TabScreenHeader “Chat Group” + glass box (messages) + quote bar + composer. Keyboard handled via `marginBottom: keyboardHeight`. Messages, quote, reactions, Realtime, mod actions. Own bubbles: gradient #00CCFF → #040A4B, 16px radius, 1px border.
- **Auth + membership gate:** Supabase email code login. `NotActiveScreen` if not active. Refresh status button.
- **Expo Go:** Run with `npx expo start` from `mobile/`. Use Command Prompt on Windows if PowerShell has script policy issues.

---

## 9. What is NOT done (future work)

- **Traffic Alerts (branch `traffic`):** Data side is done (receiver + all tables). App shows **situations** only. **Next:** (1) Ensure DB is up to date (run `docs/traffic-schema.sql` if needed) and receiver has been run so tables are populated. (2) Decide what to display: situations (done), VMS (message + location), journey times (by site), traffic status (free flow/congested). (3) Add Supabase queries and UI for chosen data (same tab with sections/filters or separate screens) and format (list/cards, detail screens).
- **Other new tabs:** Local Events, Earnings Calc, Library, Petitions, Docs Vault, Member E-Card may be placeholders; flesh out as needed.
- **Backend / API:** Supabase used for auth + members + chat; no full API layer or GoCardless integration yet.
- **Admin:** No admin app; use Supabase Table Editor for now.
- **Dashboard (Home):** Announcements / What’s On are placeholder; wire to real data when ready.
- **Notifications:** Push foundation for chat exists but not yet sending.
- **GoCardless:** Website + backend + GoCardless; app only checks membership status.

---

## 10. Known issues / snags (user noted)

- **react-native-screens:** Must stay at 4.16.0 for Expo Go + SDK 54 (see §2).  
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

**Branching:** **main** is source of truth. For new work: `git checkout main`, `git pull origin main`, `git checkout -b <branch-name>`. Current feature branch in use: **traffic** (Traffic Alerts). When done, merge to main and push; see `docs/git-daily-checklist.md` if present.

---

## 12. Suggested next tasks (pick as needed)

1. **Traffic Alerts (branch `traffic`):** Data pipeline is complete. Run `docs/traffic-schema.sql` in Supabase if new tables are missing; run receiver locally (see §5a or `docs/traffic-receiver.md`). Then decide what to show in the app (situations / VMS / journey times / traffic status), in what format, and add the queries + UI; merge to main when ready.  
2. **Other new tabs:** Add real content for Local Events, Earnings Calc, Library, Petitions, Docs Vault, Member E-Card as needed.  
3. **Snagging:** Polish touch targets, readability, any layout issues.  
4. **Backend design:** Define API and schema for member, casework, news, polls.  
5. **Admin:** Start admin UI for casework, news, polls.  
6. **Dashboard:** Wire Announcements / What’s On to real data.  
7. **Notifications:** Push or in-app for casework and expiry reminders.  
8. **Subscriptions:** GoCardless + backend driving membership status in Supabase.

---

## 13. Quick reference for the next agent

- **Member data:** `useMember()` from `@/context/MemberContext`; `saveMember(profile)`.  
- **Casework:** `useCasework()`; `createTicket(...)`; `addMessage(ticketId, 'member', text)`.  
- **News:** `useNews()`; `getPost(id)`; posts from storage.  
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` after close.  
- **Chat:** `useChat()`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods).  
- **Theme:** `useThemeColor({ light?, dark? }, 'text'|'tint'|'background'|'surface'|'border'|'textMuted')`; `Spacing`, `Radius`, `FontSize`, `NeoGlass`, `NeoText` from `@/constants/theme`. Glass: `GlassCard` with `sleek`, `gradientBorder`; `FrostedGlassView` with `intensity`, `overlayColor` for smoked glass.  
- **Routing:** `router.push('/')` for home; `router.push('/news')`, `router.push('/profile')`, `router.push('/casework')`, `router.push('/polls')`, `router.push('/chat')`, `router.push('/more')`, `router.push('/traffic-alerts')`, `router.push('/local-events')`, `router.push('/earnings-calc')`, `router.push('/library')`, `router.push('/petitions')`, `router.push('/docs-vault')`, `router.push('/member-e-card')`; `router.push(\`/casework/${id}\`)`, etc.  
- **Header / layout:** `AppHeader` and `TabScreenHeader` in `components/`. No bottom bar; home is the main menu.  
- **Git:** **main** = source of truth. Use feature branches (e.g. **traffic**) for new work; merge to main when ready.
- **Traffic receiver:** `scripts/traffic-receiver/`; `.env` with Traffic Scotland + Supabase keys; `node index.js`. Schema: `docs/traffic-schema.sql`. Full guide: `docs/traffic-receiver.md`.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
