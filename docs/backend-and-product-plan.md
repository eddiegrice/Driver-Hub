# PHD Matrix — Backend & Product Plan

**Purpose:** Single reference for backend, subscription, migration, and build order. Use this when implementing the backend, admin, or wiring the app to the server. Do not make app code changes that depend on the backend until the relevant phase is implemented.

**Last updated:** March 2025

---

## 1. Overview and key decisions

| Topic | Decision |
|-------|----------|
| **Backend scope** | Production-ready. Shared by the **members app** (Expo) and **admin** (PWA). |
| **Admin** | PWA (Progressive Web App): one codebase, works on phones and laptop; installable on home screen. Admin will mainly use phones; laptop support is required too. |
| **Hosting** | **Managed** (no self-hosted servers). Recommended: **Supabase** (Postgres + Auth + API), UK/EU region. |
| **Cost** | Free tier until live with paying members; then as low as possible (e.g. Supabase Pro ~£20–25/month). |
| **Region & security** | UK/EU for data. Robust security: HTTPS, no passwords in DB (Apple/Google sign-in), secrets in env vars, DB only via backend. |
| **Data model** | **Single source of truth:** backend is master; app loads from and saves to backend. No two-way sync. |
| **Subscription source of truth** | **App Store / Google Play** subscription status is the source of truth for “is member active?”. Our database **reflects** that (from receipt validation) so the app and admin can use it. Admin **does not** edit the real billing cycle. |
| **Legacy members (pre-app)** | One-off path: “Legacy active until [date]” so existing club members (e.g. Stripe payers) can use the app without paying again until that date; after that, they subscribe via the app and App Store takes over. |

---

## 2. Auth and identity

- **Login:** Sign in with **Apple** and **Google** only (no email/password). Backend does not store passwords.
- **Data follows the user:** When a member logs in on a new device, we look up their account by Apple/Google identity and load their profile, casework, etc. from the backend.
- **Backend stores:** Internal member id; identity id from Apple/Google; profile and related data linked to that member. Email (e.g. from Apple) can be stored for support/admin matching; we can add phone later if needed.

---

## 3. Subscription and membership

### 3.1 Normal case (App Store = source of truth)

- Member pays via in-app purchase (App Store / Google Play). We validate the receipt and store in our DB: subscription status and/or “active until” date.
- **Active** = what we get from the store. Admin **sees** this status; admin does **not** set or override the store’s billing cycle.
- If the store says they’re not active, they’re not entitled (casework, features, etc.); our app and admin both reflect that.

### 3.2 Legacy (pre-app members only)

- **Purpose:** Members who already paid the club (e.g. via Stripe) before the app can use the app from day one without paying again. When their pre-app period ends, the app takes over billing (they subscribe in-app).
- **In DB:** One-off “legacy” path: e.g. `membership_source: 'app_store' | 'legacy'` and for legacy: `legacy_active_until` (date). No general “admin edits billing cycle”; only “legacy active until” for pre-app joiners.
- **Rule for “is member active?”:** Active if (App Store subscription is valid) **OR** (legacy and today ≤ `legacy_active_until`). Otherwise not active.
- After `legacy_active_until`, we do **not** auto-charge; we require an in-app subscription. From then on, App Store is their source of truth too.

---

## 4. Legacy migration flow (Option B)

- **No pre-registration.** We avoid deadwood from people who never join the app.
- **First open after sign-in:** If we have no active subscription and no legacy for this user, show **one screen** with **two options:**
  1. **“I’m an existing club member”** → Request migration. Copy: “An admin will move your current subscription to this app. You’ll get access once that’s done.”
  2. **“I’m new – I want to join”** → Send them to in-app subscription (App Store).
- **Backend:** “Request migration” creates a **pending migration** record (e.g. status `pending_migration`). Admin sees a list of pending requests; admin can **approve** (set legacy + `legacy_active_until`) or **decline** (user sees “Subscribe or contact support”).
- **Non-members:** If someone who isn’t a pre-app member taps “existing member”, they stay pending until admin declines; we do not grant access without admin setting legacy.
- **Time-limited:** “Request migration” is **not** permanent. A **config** (e.g. “Legacy migration open” on/off or “Migration period ends [date]”) controls it:
  - **On:** Show both options (existing member / new – subscribe).
  - **Off:** New sign-ups only see “Subscribe to join” (and optionally “Contact support”). Existing legacy members keep their status; we only stop offering the migration request to new people.
- **Cleanup:** Admin can reject migration requests. Optionally, auto-hide or archive pending requests older than X days to avoid clutter.

---

## 5. Getting legacy members past the App Store

- The app is **free to download**. The paywall is **inside the app**, driven by our backend.
- When a legacy member opens the app after admin has set `legacy_active_until`, we return “active” and **do not** show the in-app subscription screen. The App Store never blocks them.
- We only show the in-app purchase when: (a) they’re not active and (b) they’re not legacy within their active-until date (or they’re past that date and need to renew).

---

## 6. Tech stack (recommended)

- **Database & Auth & API:** **Supabase** (managed Postgres, built-in Auth, REST/API). UK/EU region.
- **Members app:** Existing Expo app in `mobile/`; will call Supabase (and any custom API) when backend is wired.
- **Admin:** PWA (e.g. React or Next.js), same backend. Can be in this repo (e.g. `admin/`) or separate; TBD.
- **Custom logic:** If Supabase’s built-in API is not enough (e.g. legacy rules, migration list), add a small API (e.g. Node on Railway/Render) that uses the same Postgres; keep it minimal to control cost.

---

## 7. Build order

Implement in this order so each step has a clear goal:

1. **Backend foundation + auth + member**  
   - Supabase project, Postgres schema for members (and identity link).  
   - Sign in with Apple / Google in the app.  
   - Member profile stored in DB and loaded on login (data follows the user).

2. **Membership / subscription in DB + legacy**  
   - Tables/columns: subscription status (from store), legacy flag, `legacy_active_until`.  
   - Rule: active = store valid OR (legacy and today ≤ legacy_active_until).  
   - Admin PWA (or minimal admin): view member list, see active/expired, **set legacy + legacy_active_until** for migration; **pending migration** list with approve/decline.

3. **Legacy migration flow in the app**  
   - Post-sign-in screen when not active: two options (existing member → request migration; new → subscribe).  
   - Config for “migration open” so we can turn off the migration request later.

4. **Casework**  
   - Tickets and messages in DB; app sends/receives; admin replies and sets status.

5. **News**  
   - Posts in DB; app reads; admin creates/edits.

6. **Polls**  
   - Polls and responses in DB; app lists, submits, results when closed; admin creates polls and sees results.

7. **App-store subscriptions (IAP)**  
   - Receipt validation; update DB from store; “active” from store as in §3.1. Manual override only for legacy, not for editing store billing.

---

## 8. High-level data model (to be detailed in schema)

- **Members:** id, identity (Apple/Google), email (optional), profile fields (name, badge, vehicle, etc.), created/updated.
- **Membership / subscription:** Link to member; subscription status or “active until” (from store); for legacy: `membership_source`, `legacy_active_until`. Pending migration: status (e.g. `pending_migration`) and optional admin notes.
- **Casework:** Tickets (member, snapshot, type, subject, status, timestamps), messages (sender, text, timestamp), attachments.
- **News:** Posts (title, body, publishedAt, author, etc.).
- **Polls:** Polls (title, description, dates, questions/options), responses (member, poll, answers), results when closed.

Exact table names, columns, and indexes to be written in a separate schema doc or migration files when implementation starts.

---

## 9. Quick reference for implementation

- **Active check:** `active = (subscription_valid_from_store) OR (membership_source = 'legacy' AND today <= legacy_active_until)`.
- **Migration:** User requests migration → create/update record with `pending_migration`; admin approves (set legacy + date) or declines; config turns off “request migration” after migration period.
- **App Store:** Free to download; paywall in-app only; legacy members never see paywall until legacy period ends.
- **Admin:** Sees subscription status (read-only from store data); can set legacy + legacy_active_until for pre-app members; can approve/decline migration requests.

Use this document together with `HANDOFF.md` (app structure, existing types, design system) when building.
