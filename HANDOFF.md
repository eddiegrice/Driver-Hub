# DriverHub App — Handoff for Next Session

**Purpose of this file:** Give the next AI chat agent everything needed to continue work without guessing. Copy or paste the relevant sections into your first message, or tell the agent to read `HANDOFF.md` in the project root.

---

## 1. Project overview

- **App name:** DriverHub  
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
│   ├── _layout.tsx          # Root: ThemeProvider, SafeAreaProvider, Member/Casework/News/Polls providers, Stack
│   ├── modal.tsx            # Placeholder modal (expo-router)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar: Home, Profile, Casework, News, Polls, Chat, More
│       ├── index.tsx        # Home (dashboard placeholder + quick links)
│       ├── profile.tsx      # Profile: MembershipCard + editable form, Save
│       ├── chat.tsx         # Club Chat: single global room, bubbles, quote, reactions, mod actions (branch only)
│       ├── more.tsx         # More (placeholder for future features)
│       ├── casework/
│       │   ├── _layout.tsx  # Stack for casework
│       │   ├── index.tsx    # List of tickets + "New request" button
│       │   ├── new.tsx      # New request form (type, subject, message, photo attach)
│       │   └── [id].tsx     # Ticket detail: messages thread, reply input, attachments
│       ├── news/
│       │   ├── _layout.tsx
│       │   ├── index.tsx    # List of posts
│       │   └── [id].tsx     # Post detail; body has tappable URLs (regex-detected)
│       └── polls/
│           ├── _layout.tsx
│           ├── index.tsx    # Open polls + Closed polls sections
│           └── [id].tsx     # Take poll (if open) / Thank you (if responded) / Results (if closed)
├── components/
│   ├── MembershipCard.tsx   # Premium card (teal, amber strip, name, membership no, status, expiry)
│   ├── parallax-scroll-view.tsx  # ScrollView + optional header; fixed status bar strip; uses Spacing
│   ├── themed-text.tsx      # Uses FontSize, LineHeight; link uses theme tint
│   ├── themed-view.tsx
│   └── ui/
│       ├── Card.tsx         # accent (left bar), elevated (shadow)
│       ├── PrimaryButton.tsx
│       └── icon-symbol.tsx  # SF Symbol → MaterialIcons mapping for Android (tab icons)
├── constants/
│   └── theme.ts             # Colors (light/dark), Brand, Spacing, Radius, FontSize, LineHeight
├── context/
│   ├── MemberContext.tsx    # useMember(): member, isLoading, setMember, saveMember
│   ├── CaseworkContext.tsx  # useCasework(): tickets, getTicket, createTicket, addMessage, setTicketStatus
│   ├── NewsContext.tsx     # useNews(): posts, getPost, refreshPosts
│   ├── PollsContext.tsx     # usePolls(): polls, openPolls, closedPolls, getPoll, getMyResponse, submitResponse, getResults
│   └── ChatContext.tsx     # useChat(): messages, sendMessage, addReaction, deleteMessage (mod), quotedMessage, setQuotedMessage (branch only)
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

---

## 4. Data models (summary)

- **MemberProfile** (`types/member.ts`): name, badgeNumber, badgeExpiry, vehicleRegistration, vehicleMake, vehicleModel, plateNumber, plateExpiry, membershipNumber, membershipStatus ('active'|'expired'|'pending'), membershipExpiry. Single object per device; used for card, casework snapshot, and future expiry reminders.  
- **Casework:** Tickets have id, memberSnapshot (MemberProfile at create time), type, subject, status, createdAt, updatedAt, messages[], attachments[]. Messages have sender ('member'|'admin'), text, createdAt. Status flow: sent_pending → being_reviewed → being_actioned → resolved → closed. Only member side is implemented; admin will set status and reply.  
- **News:** Posts have id, title, body (plain text; URLs made tappable in UI), publishedAt, authorName. Seeded with two sample posts on first run.  
- **Polls:** Poll has id, title, description, startsAt, endsAt, questions[], isAnonymous. Questions: type 'single'|'multiple'|'text', options[]. Members **cannot create** polls; they only answer. **Results are hidden until poll has closed** (endsAt < now). PollResults stored per poll for closed polls (seeded for sample closed poll). Responses stored in `@driverhub_poll_responses`.  
- **Chat (branch):** Single global club room (`main`). Messages: room_id, member_id, display_name, body, quoted_message_id, created_at. Stored in Supabase `chat_messages`; Realtime for live updates. Reactions on messages; moderators (members.is_chat_moderator) can delete messages and manage bans/room lock. See `docs/supabase-schema.sql` for tables and RLS.

---

## 5. Design system (already applied)

- **Palette:** Brand.primary `#0D5C63`, Brand.primaryDark `#08464B`, Brand.accent `#D4A012`. Light: background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`. Dark: background `#0F172A`, surface `#1E293B`, tint = accent (amber).  
- **Spacing / Radius / FontSize:** Exported from `constants/theme.ts`. Use `Spacing.*`, `Radius.*`, `FontSize.*`, `LineHeight.*` for new UI.  
- **Components:** Use `Card` (accent, elevated), `PrimaryButton` (fullWidth), `MembershipCard` for the profile card. ParallaxScrollView uses a fixed status-bar strip so content doesn’t scroll under the clock/battery.  
- **Tab bar:** Themed background and border; active tint from theme. Icons: `components/ui/icon-symbol.tsx` maps SF Symbol names to MaterialIcons for Android (tab icons listed there).

---

## 6. What is implemented and working

- **Home:** Hero block (teal), section cards with links to News, Profile, Casework, Polls.  
- **Profile:** MembershipCard (teal card, amber strip, name, membership no, status, expiry) + form for all MemberProfile fields + Save (persists to AsyncStorage).  
- **Casework:** List of tickets; New request (type, subject, message, photo attach); ticket detail with message thread and reply; member snapshot stored with each ticket.  
- **News:** List of posts (seed data); detail with tappable URLs in body.  
- **Polls:** Open / Closed lists; take poll (single/multiple/text); thank-you after submit; results only when closed; one open + one closed poll seeded.  
- **More:** Placeholder screen.  
- **Chat (feature branch only):** Single global Club Chat tab. Messages load from Supabase; send message, quote (swipe right to reply), react (e.g. thumbs up), Realtime updates. Moderators can delete messages. Keyboard handling and bubble layout tuned for Android/Expo Go. Push device registration is set up for future chat notifications (skipped in Expo Go). **Not yet merged to main** — more work planned before merge.
- **Auth + membership gate:** Supabase email **code** login (`SignInScreen` → `AuthContext`). After sign-in, `MemberContext` loads profile + membership status from Supabase. If `membership_status === 'active'`, the user sees the main app; otherwise they see the `NotActiveScreen` (“Get access to DriverHub”), which acts as a paywall and offers a **Refresh status** button. Membership status is currently edited manually via Supabase; later it will be driven by GoCardless + backend.
- **Expo Go:** App runs in Expo Go; user uses Command Prompt (not PowerShell, due to script policy) and `npx expo start` from `mobile/`.

---

## 7. What is NOT done (future work)

- **Chat merge:** Chat is implemented on a feature branch but **not merged to main**. Polish and final checks are planned before merging (e.g. UX polish, edge cases, any snagging).  
- **Backend / API / database:** A real backend around Supabase is only partly designed. Supabase `members` table exists and is used for auth + membership status, but there is no full API layer or GoCardless integration yet. Plan is: website + backend + GoCardless manage billing, then update `membership_status` and related fields in Supabase.  
- **Admin side:** No admin app or web panel yet. Admins currently have to use the Supabase Table Editor to mark members as active/expired. Long term: build an admin UI (web or PWA) to manage members, casework, news, polls.  
- **Dashboard (Home):** Content is static/placeholder. Should later pull from news, casework, expiries, and membership status.  
- **Notifications:** No push or in-app notifications yet (expiry reminders, casework updates, membership issues, etc.). Chat push foundation is in place (device token storage) but not yet sending.  
- **GoCardless integration:** No GoCardless integration yet. The plan is: members join on the website, set up a GoCardless direct debit, backend updates Supabase membership fields, and the app just checks that status.

---

## 8. Known issues / snags (user noted)

- **Styling snags:** User said there were “a couple of styling problems” on casework (or elsewhere) and wanted to come back to them in a later “snagging” pass. No specific list was recorded; the next agent can do a quick pass and fix obvious layout/contrast/touch-target issues.  
- **react-native-screens:** Must stay at 4.16.0 for Expo Go + SDK 54 (see §2).  
- **Windows:** User runs npm in **Command Prompt**; PowerShell has execution policy issues with npm.  
- **Node/npx:** User has Node and npx installed; project was created with `npx create-expo-app@latest mobile` in `DriverHubApp`.

---

## 9. How to run the app

```cmd
cd c:\Users\eddie\Documents\DriverHubApp\mobile
npm install
npx expo start
```

Then scan the QR code with **Expo Go** on the phone. Use **Command Prompt** (not PowerShell) for these commands if the user is on Windows.

**If work is on a feature branch:** Commit and push that branch so it’s saved on GitHub. When resuming, `git checkout <branch-name>` then `git pull` so you’re on the latest for that branch.

---

## 10. Suggested next tasks (pick as needed)

1. **Chat:** Finish polish and any remaining work on the chat feature branch, then merge to main when ready.  
2. **Snagging:** Fix remaining styling/layout issues the user mentioned; polish touch targets and readability.  
3. **Backend design:** Define API (auth, member, casework, news, polls) and DB schema so the app can be wired to a real server later.  
4. **Admin:** Start an admin UI (web or separate app) for casework, news, and polls.  
5. **Dashboard:** Wire Home to real data (e.g. latest news, open casework count, upcoming expiries).  
6. **Notifications:** Add push or in-app notifications for casework and expiry reminders.  
7. **Subscriptions:** Integrate app-store IAP and map subscription status to membership.

---

## 11. Quick reference for the next agent

- **Member data:** `useMember()` from `@/context/MemberContext`; persist with `saveMember(profile)`.  
- **Casework:** `useCasework()`; `createTicket({ memberSnapshot, type, subject, status, messages, attachments })`; `addMessage(ticketId, 'member', text)`.  
- **News:** `useNews()`; `getPost(id)`; posts from storage, seed in `lib/news-storage.ts`.  
- **Polls:** `usePolls()`; `openPolls`, `closedPolls`; `submitResponse(pollId, answers)`; `getResults(pollId)` only after close.  
- **Chat (branch):** `useChat()` from `@/context/ChatContext`; `messages`, `sendMessage(body, quotedMessage?)`, `addReaction(messageId, emoji)`, `deleteMessage(id)` (mods), `quotedMessage` / `setQuotedMessage`; data via `lib/chat-supabase.ts` and Realtime.  
- **Theme:** `useThemeColor({ light?, dark? }, 'text'|'tint'|'background'|'surface'|'border'|'textMuted')`; `Spacing`, `Radius`, `FontSize`, `Brand` from `@/constants/theme`.  
- **Routing:** `router.push('/casework/new')`, `router.push(\`/casework/${id}\`)`, `router.push('/news')`, `router.push('/polls')`, `router.push('/profile')`, `router.push('/chat')` from `expo-router`.

Use this handoff so the next session can continue without re-discovering the codebase or breaking existing behavior.
