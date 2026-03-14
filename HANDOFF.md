# PHD Matrix App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `HANDOFF.md` in the project root.

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

**Branch / Chat:** The **Club Chat** feature is developed on a **feature branch** (not `main`). Chat is implemented and working (messages, quoting, reactions, moderation, Realtime), but **not yet merged to main**. More polish and checks are planned before merge. When resuming Chat work, use that branch; do not assume Chat exists on `main`.

---

## 2. Tech stack (current)

- **Framework:** Expo ~54, React 19, React Native 0.81  
- **Routing:** expo-router (file-based). Tabs + nested stacks.  
- **Auth:** Supabase email **code** login (passwordless). Supabase JS client configured in `lib/supabase.ts`; auth context in `context/AuthContext.tsx`; sign-in UI in `components/auth/SignInScreen.tsx`.  
- **Backend data:** Supabase Postgres (project already created) with a `members` table as per `docs/supabase-schema.sql`. Member profile + membership status are loaded/saved via `lib/member-supabase.ts`. Chat uses Supabase tables `chat_messages`, `chat_reactions`, `chat_room_state`, etc. (see `docs/supabase-schema.sql`) and Realtime; see `lib/chat-supabase.ts`.  
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
│       ├── _layout.tsx      # No bottom tab bar. AppHeader (logo + PHD MATRIX + Home) then TabSlot. Hidden TabList for routes.
│       ├── index.tsx        # Home = main menu: membership card + large icon grid (News, Profile, Casework, Polls, Chat, More) + Latest updates
│       ├── profile.tsx      # Profile: TabScreenHeader "Profile" + MembershipCard + editable form, Save
│       ├── chat.tsx         # Chat Group: TabScreenHeader + glass box (messages) + quote bar + composer; keyboard handled via marginBottom
│       ├── more.tsx         # More: TabScreenHeader "More" + placeholder
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
│   ├── AppHeader.tsx        # Global header on every tab: logo placeholder (left, pressable → home) + "PHD MATRIX" (pressable → home) + Home button (right, router.push('/'))
│   ├── TabScreenHeader.tsx  # Unified tab title: two faint horizontal lines + one title line (subtitle size, semibold). Used on Chat, News, Casework, Polls, More, Profile.
│   ├── FrostedGlassView.tsx # Glassmorphism: expo-blur (intensity 20) + rgba(255,255,255,0.07) overlay. Used inside GlassCard and chat glass box.
│   ├── MembershipCard.tsx   # Premium card (teal, amber strip, name, membership no, status, expiry)
│   ├── parallax-scroll-view.tsx  # Legacy; tab screens now use ScrollView + TabScreenHeader + content (not ParallaxScrollView)
│   ├── themed-text.tsx      # Uses FontSize, LineHeight; title/subtitle semibold (600); optional fontFamily from theme
│   ├── themed-view.tsx
│   └── ui/
│       ├── Card.tsx         # accent (left bar), elevated (shadow) — legacy
│       ├── GlassCard.tsx     # Neo-glass: FrostedGlassView + 1px border (NeoGlass.cardBorder). Optional gradientBorder for Active Membership (#00ccff → #1a0033).
│       ├── PrimaryButton.tsx
│       └── icon-symbol.tsx  # SF Symbol → MaterialIcons mapping for Android
├── constants/
│   └── theme.ts             # NeoBase, NeoGlass, NeoText, NeoAccent, Spacing, Radius, FontSize, FontWeight, Fonts, MembershipCardBorderGradient
├── context/
│   ├── MemberContext.tsx    # useMember(): member, isLoading, setMember, saveMember
│   ├── CaseworkContext.tsx  # useCasework(): tickets, getTicket, createTicket, addMessage, setTicketStatus
│   ├── NewsContext.tsx      # useNews(): posts, getPost, refreshPosts
│   ├── PollsContext.tsx     # usePolls(): polls, openPolls, closedPolls, getPoll, getMyResponse, submitResponse, getResults
│   └── ChatContext.tsx      # useChat(): messages, sendMessage, addReaction, deleteMessage (mod), etc. (branch only)
├── hooks/
│   ├── use-color-scheme.ts
│   └── use-theme-color.ts   # useThemeColor(props, 'text'|'tint'|'background'|'surface'|'border'|'textMuted' etc.)
├── lib/
│   ├── member-storage.ts    # getStoredMember, setStoredMember
│   ├── casework-storage.ts  # getStoredTickets, addTicket, updateTicket, addMessageToTicket
│   ├── news-storage.ts      # getStoredPosts, setStoredPosts, ensureSeeded (seed 2 posts)
│   ├── polls-storage.ts     # getStoredPolls, getStoredResponses, addResponse, getMyResponse, getStoredResults, setStoredResults, ensurePollsSeeded
│   └── chat-supabase.ts     # loadMessages, sendMessage, addReaction, deleteMessage, subscribeRoom, getRoomState (branch only)
└── types/
    ├── member.ts    # MemberProfile, emptyMemberProfile, formatDateForDisplay
    ├── casework.ts  # CaseworkTicket, CaseworkMessage, CaseworkAttachment, CaseworkStatus, CaseworkType, statusLabel
    ├── news.ts      # NewsPost
    ├── polls.ts     # Poll, PollQuestion, PollOption, PollResponse, PollAnswer, PollResults, isPollOpen, isPollClosed
    └── chat.ts      # ChatMessage, ChatReaction, etc. (branch only)
```

**Removed components (no longer in codebase):** `DashboardMenuBar.tsx`, `DashboardMenuTabBar.tsx` (bottom nav was removed; home is the main menu). `GlassTabBar.tsx` and `haptic-tab.tsx` exist but are legacy/unused.

---

## 4. Navigation and layout (current)

- **No bottom tab bar.** The home screen **is** the main menu.
- **Global header (every tab):** `AppHeader` at the top of `(tabs)/_layout.tsx`: left = logo placeholder (white circle, cyan #00ccff border) + “PHD” (superheavy) + “MATRIX” (light, caps). Right = “Home” button (house icon + label). **Logo and title are pressable** and call `router.push('/')` when not already on home. **Home button** does the same.
- **Tab content:** Below the header, `TabSlot` renders the active route. Routes are switched by navigating (e.g. from home menu tiles via `router.push('/news')`, and back via Home/logo).
- **Tab screen headers:** Every tab except home uses `TabScreenHeader` with a single title (e.g. “Chat Group”, “News & Updates”, “Profile”, “Casework”, “Polls”, “More”). Design: two faint horizontal lines (NeoGlass.stroke) with the title between them; font subtitle size, semibold; extra padding above/below text.
- **Home screen content:** No duplicate hero (hero is in AppHeader). Content: membership card (GlassCard with gradient border when active), then the **menu grid** (large icon tiles for News, Profile, Casework, Polls, Chat, More), then “Latest updates” card. No bottom bar padding.
- **Other tab screens:** Each uses `View` → `TabScreenHeader` → `ScrollView` with content; consistent padding horizontal `Spacing.xl`, top `Spacing.md`, bottom `Spacing.xxl`. No ParallaxScrollView.

---

## 5. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, badgeExpiry, vehicleRegistration, vehicleMake, vehicleModel, plateNumber, plateExpiry, membershipNumber, membershipStatus ('active'|'expired'|'pending'), membershipExpiry. Single object per device; used for card, casework snapshot, and future expiry reminders.  
- **Casework:** Tickets have id, memberSnapshot (MemberProfile at create time), type, subject, status, createdAt, updatedAt, messages[], attachments[]. Messages have sender ('member'|'admin'), text, createdAt. Status flow: sent_pending → being_reviewed → being_actioned → resolved → closed. Only member side is implemented; admin will set status and reply.  
- **News:** Posts have id, title, body (plain text; URLs made tappable in UI), publishedAt, authorName. Seeded with two sample posts on first run.  
- **Polls:** Poll has id, title, description, startsAt, endsAt, questions[], isAnonymous. Questions: type 'single'|'multiple'|'text', options[]. Members **cannot create** polls; they only answer. **Results are hidden until poll has closed** (endsAt < now). PollResults stored per poll for closed polls (seeded for sample closed poll). Responses stored in `@driverhub_poll_responses`.  
- **Chat (branch):** Single global club room (`main`). Messages: room_id, member_id, display_name, body, quoted_message_id, created_at. Stored in Supabase `chat_messages`; Realtime for live updates. Reactions on messages; moderators (members.is_chat_moderator) can delete messages and manage bans/room lock. See `docs/supabase-schema.sql` for tables and RLS.

---

## 6. Design system (Neo-Gradients Glassmorphism, fixed dark)

- **Fixed dark theme:** The app always uses the dark design (no switching with system/phone settings). `useColorScheme()` always returns `'dark'`.
- **Permanent background:** A **purple gradient portal** (blue–purple glow) is the fixed background for the **whole app**. It is rendered once in `app/_layout.tsx` via `GradientPortalBackground`. All screens use a **transparent** theme background so this gradient shows through. Use **containers** (e.g. `GlassCard`, `FrostedGlassView`) for content blocks, not full-screen opaque backgrounds.
- **Glassmorphism:** Solid grey surfaces have been replaced with **rgba(255,255,255,0.07)** overlay on top of **expo-blur** (intensity 20) via `FrostedGlassView`. Cards use **1px border** `NeoGlass.cardBorder` (rgba(255,255,255,0.15)). Active Membership card can use **gradient border** `#00ccff` → `#1a0033` via `GlassCard` prop `gradientBorder`.
- **Palette:** Base canvas `#101115`. Portal gradient: `#3D37F2` → `#8930F3`. Glass: `NeoGlass.frostedOverlay`, `cardBorder`, `surface`, `surfaceElevated`. Text: `NeoText.primary`, `secondary`, `muted`. Accents: `NeoAccent.purple`, `cyan`, etc. Theme also defines `MembershipCardBorderGradient`, `FontWeight.superheavy`, `light`, `thin`, `Fonts.sans` (platform).
- **Containers:** Prefer `GlassCard` from `components/ui/GlassCard.tsx` (FrostedGlassView + border; optional `gradientBorder`). Legacy `Card` and `PrimaryButton` still exist.
- **Typography:** Headings use **semi-bold (600)**. ThemedText `title` and `subtitle` types use 600. Home hero used to have “PHD” superheavy and “MATRIX” light caps; that branding is now in `AppHeader`. `TabScreenHeader` uses `FontSize.subtitle`, `FontWeight.semibold`.
- **Spacing / Radius:** `Spacing.*`, `Radius.card` (32), `Radius.lg` (16), etc. in `constants/theme.ts`. Chat glass box uses `Radius.lg` for a smaller corner radius.

---

## 7. Chat screen (branch) — layout and keyboard

- **Title:** “Chat Group” (single line in `TabScreenHeader`). Mod menu (⋮) remains on the right when user is a moderator.
- **Scroll area:** The message list is inside a **glassmorphic container**: outer wrapper `glassBoxOuter` (margins: horizontal `Spacing.md`, top/bottom `Spacing.sm`), inner `glassBox` (1px border, `Radius.lg`, `FrostedGlassView`). The **FlatList** scrolls inside this box; it does **not** include the composer. Quote bar (when replying) and composer sit **below** the glass box.
- **Composer:** Below the glass box. `paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm` so it sits above the device gesture area. **Keyboard:** The composer uses **marginBottom: keyboardHeight** when the keyboard is open (from `Keyboard.addListener` for `keyboardWillShow` / `keyboardDidShow`). This is the **only** shift applied (no `KeyboardAvoidingView`), so the input moves up by exactly the keyboard height and stays visible with no large gap. Send button has reduced padding (e.g. `Spacing.md` horizontal, `Spacing.sm` vertical, minHeight 36).

---

## 8. What is implemented and working

- **Home:** Main menu: membership card (GlassCard, gradient border when active) + large icon grid (News, Profile, Casework, Polls, Chat, More) + Latest updates card. No bottom bar; navigation via tiles and Home/logo in header.
- **Profile:** TabScreenHeader “Profile” + MembershipCard + form + Save (persists to AsyncStorage / Supabase as configured).
- **Casework:** TabScreenHeader “Casework” + list of tickets; New request; ticket detail with message thread and reply.
- **News:** TabScreenHeader “News & Updates” + list of posts; detail with tappable URLs.
- **Polls:** TabScreenHeader “Polls” + Open / Closed lists; take poll; thank-you; results when closed.
- **More:** TabScreenHeader “More” + placeholder.
- **Chat (feature branch):** TabScreenHeader “Chat Group” + glass box (messages) + quote bar + composer. Keyboard handled via `marginBottom: keyboardHeight`. Messages, quote, reactions, Realtime, mod actions. **Not yet merged to main.**
- **Auth + membership gate:** Supabase email code login. `NotActiveScreen` if not active. Refresh status button.
- **Expo Go:** Run with `npx expo start` from `mobile/`. Use Command Prompt on Windows if PowerShell has script policy issues.

---

## 9. What is NOT done (future work)

- **Chat merge:** Chat is on a feature branch; polish and merge to main when ready.  
- **Backend / API / database:** Supabase used for auth + members + chat; no full API layer or GoCardless integration yet.  
- **Admin side:** No admin app; use Supabase Table Editor for now.  
- **Dashboard (Home):** Content is still largely static/placeholder; could wire to news, casework, expiries.  
- **Notifications:** Push foundation for chat exists but not yet sending.  
- **GoCardless:** Plan is website + backend + GoCardless; app only checks membership status.

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

**If work is on a feature branch:** Commit and push; when resuming, `git checkout <branch-name>` and `git pull`.

---

## 12. Suggested next tasks (pick as needed)

1. **Chat:** Finish polish on the chat feature branch, then merge to main.  
2. **Snagging:** Fix any remaining styling/layout issues; polish touch targets and readability.  
3. **Backend design:** Define API and schema for member, casework, news, polls.  
4. **Admin:** Start admin UI for casework, news, polls.  
5. **Dashboard:** Wire Home to real data (latest news, casework count, expiries).  
6. **Notifications:** Push or in-app notifications for casework and expiry reminders.  
7. **Subscriptions:** GoCardless + backend driving membership status in Supabase.

---

## 13. Quick reference for the next agent

- **Member data:** `useMember()` from `@/context/MemberContext`; `saveMember(profile)`.  
- **Casework:** `useCasework()`; `createTicket(...)`; `addMessage(ticketId, 'member', text)`.  
- **News:** `useNews()`; `getPost(id)`; posts from storage.  
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` after close.  
- **Chat (branch):** `useChat()`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods).  
- **Theme:** `useThemeColor({ light?, dark? }, 'text'|'tint'|'background'|'surface'|'border'|'textMuted')`; `Spacing`, `Radius`, `FontSize`, `NeoGlass`, `NeoText` from `@/constants/theme`.  
- **Routing:** `router.push('/')` for home; `router.push('/news')`, `router.push('/profile')`, `router.push('/casework')`, `router.push('/polls')`, `router.push('/chat')`, `router.push('/more')`; `router.push(\`/casework/${id}\`)`, etc.  
- **Header / layout:** `AppHeader` and `TabScreenHeader` in `components/`. No bottom bar; home is the main menu.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
