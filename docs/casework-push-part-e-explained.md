# Part E explained in plain English (casework push)

This document explains **what the Edge Function does**, **in order**, without assuming you know programming. The real code lives in [`supabase/functions/casework-push/index.ts`](../supabase/functions/casework-push/index.ts).

---

## The big picture (one sentence)

When the **database** changes (new message, new case, status change), Supabase **calls your function**; the function **looks up phone tokens** in `member_devices` and asks **Expo** to show a notification.

Think of it like: **doorbell (webhook) → butler (function) → intercom (Expo) → your phone**.

---

## Step 1 — Is this request allowed?

1. Supabase sends an HTTP **POST** to your function URL.
2. Your function checks the header **`x-casework-secret`**. It must **exactly match** the secret you stored in Supabase as **`CASEWORK_PUSH_SECRET`**.
3. If it does not match → respond **401** (unauthorised) and **stop**. Nobody else should trigger pushes.

**Why:** Without this, anyone who guesses your function URL could try to spam notifications.

---

## Step 2 — Can the function talk to the database?

1. The function reads **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** from its environment (you set these as Edge Function secrets).
2. If either is missing → respond **500** and stop.
3. It creates a **Supabase client** with the **service role** key. That client can read tables **even though** normal app users are restricted by RLS — which is **required** so the function can read `member_devices` for any member.

**Why:** The app only stores “this user’s token” under normal login. The **server** needs to read tokens for **whoever should be notified**, including admins.

---

## Step 3 — Read the “parcel” Supabase sent (the webhook body)

The body is **JSON**. Rough shape:

```json
{
  "type": "INSERT",
  "table": "casework_messages",
  "schema": "public",
  "record": { "id": "...", "case_id": "...", "author_member_id": "...", "body": "..." },
  "old_record": null
}
```

- **`type`**: `INSERT` (new row) or `UPDATE` (row changed).
- **`table`**: which table changed (`casework_messages` or `casework_cases`).
- **`record`**: the **new** row (after insert or after update).
- **`old_row` / `old_record`**: on **UPDATE**, the **previous** row so you can see what changed (e.g. old `status` vs new `status`).

If the JSON is broken → respond **400** and stop.

---

## Step 4 — Decide **who** should get a push (the rules)

The function uses **`table`** + **`type`** like a **decision tree**.

### A) Table `casework_messages`, event `INSERT` (someone sent a message)

1. Read **`case_id`** and **`author_member_id`** from `record`.
2. Load that **case** from `casework_cases` to get **`member_id`** (the driver linked to the case, if any) and a **short title** (`subject`).
3. Look up whether the **author** is an **admin** (`members.is_admin` for `author_member_id`).

**If the author is admin (club replied):**

- If the case has a **`member_id`** (normal member case) and the member is not the author → **notify that member** (“The club replied…”).
- If the case has **no** `member_id` (**internal** case) → **notify other admins** (so staff see there’s a new note).

**If the author is not admin (member posted):**

- **Notify admins** (every `members` row with `is_admin = true`), **except** you skip the author’s id so someone doesn’t ping themselves if they’re both member and admin.

---

### B) Table `casework_cases`, event `INSERT` (a case was created)

Read from `record`: **`member_id`**, **`opened_by_admin`**, **`created_by_id`**, **`subject`**, **`id`** (case id).

**If `opened_by_admin` is true and `member_id` is set** (club opened a case **for** that member):

- **Notify that member** (“A case was opened for you”).

**If `opened_by_admin` is false and `member_id` is set** (member opened their own case):

- **Notify admins** (excluding `created_by_id` so the creator isn’t spammed if they’re admin).

**If `member_id` is null** (internal case):

- **Notify other admins** (excluding creator).

---

### C) Table `casework_cases`, event `UPDATE` (something on the case changed)

1. Compare **`record.status`** with **`old_record.status`**.
2. If **`member_id`** is set and **status actually changed** → **notify that member** with a readable label (e.g. “Investigating”, “Closed - Resolved”).

**Why we need `old_record`:** Otherwise every update (even unrelated fields) could send a push. We only want pushes when **status** changes.

---

## Step 5 — Turn member IDs into phone tokens

Notifications go to **Expo push tokens**, not to email addresses.

1. For each target **member UUID**, query **`member_devices`**:
   - `select push_token where member_id in (...)`
2. **Remove duplicates** (same person, two phones → two tokens; both can get one message each, but duplicate tokens are deduped).

If there are **no tokens** (user denied notifications or never opened app as active member), **nothing is sent** — that’s normal.

---

## Step 6 — Call Expo’s push API

1. Build a list of small objects: `{ to: "<ExponentPushToken[...]>", title: "...", body: "...", data: { ... } }`.
2. **POST** to `https://exp.host/--/api/v2/push/send` with that list (Expo accepts **many** at once; the code sends in chunks of up to 100).
3. If you set **`EXPO_ACCESS_TOKEN`** as a secret, the function adds `Authorization: Bearer …` (recommended for production / rate limits). If you omit it, Expo may still accept some traffic; see [Expo push docs](https://docs.expo.dev/push-notifications/sending-notifications/).

4. Log any HTTP errors or per-ticket errors from Expo’s JSON response (visible in **Edge Function logs** in Supabase).

---

## Step 7 — Respond to Supabase so the webhook is happy

Return **200** JSON like `{ ok: true, notificationCount: N, ... }` when the run finished.

**Why:** If you return **5xx** too often, Supabase may **retry** the webhook and people could get **duplicate** notifications.

---

## What you do **not** need to do in the app for Part E

- The app **already** saves tokens to `member_devices` when the user is active (see `RegisterPushToken` / `push-device-supabase.ts`).
- Part E is **only** the **server** function + **webhooks** + **secrets**.

---

## Quick checklist after code is deployed

1. Secrets set: `CASEWORK_PUSH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `EXPO_ACCESS_TOKEN`.
2. Deploy: `supabase functions deploy casework-push --no-verify-jwt`.
3. Webhooks created for `casework_messages` INSERT and `casework_cases` INSERT + UPDATE, with header `x-casework-secret`.
4. Test on a **real phone** with notifications allowed; confirm a row exists in `member_devices` for that user.

---

## If something fails

1. **Supabase Dashboard → Edge Functions → casework-push → Logs** — read the error line.
2. **Expo push response** — often says `DeviceNotRegistered` (old token) or invalid token format.
3. **Webhook delivery** — Database Webhooks UI sometimes shows delivery status / last error.

If you want changes to the **wording** of notifications or **who** gets them, say what you prefer and we can adjust the rules in `index.ts`.
