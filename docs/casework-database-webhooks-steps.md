# Step-by-step: Database Webhooks for casework push

This guide walks you through creating **three** webhooks in Supabase so your **`casework-push`** Edge Function runs when casework data changes.

**Before you start — have these ready**

1. You already **deployed** the Edge Function `casework-push` (see [`casework-push-setup.md`](casework-push-setup.md)).
2. You already set the secret **`CASEWORK_PUSH_SECRET`** in **Project Settings → Edge Functions → Secrets** (or **Vault**). You need the **same long password string** when you add the header below.
3. Your **project reference** (`project-ref`): open the Supabase Dashboard and look at the browser URL. It looks like  
   `https://supabase.com/dashboard/project/abcdefghijklmnop`  
   The part **`abcdefghijklmnop`** is your `project-ref`.
4. Your function URL is always:

   ```text
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/casework-push
   ```

   Replace `YOUR_PROJECT_REF` with your real ref (no angle brackets).

---

## Part 1 — Open the right screen in Supabase

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click your **PHD Matrix / DriverHub** project (whatever you named it).
3. In the **left sidebar**, click **Integrations** (sometimes shown as a plug icon).
4. Click **Webhooks** (or **Database Webhooks** / **Hooks** — wording varies slightly).
5. You should see a list of webhooks (maybe empty) and a button like **Create a new hook** or **Add webhook** or **New webhook**. Click it.

If you do **not** see Integrations → Webhooks, try:

- **Database** (left sidebar) → look for **Webhooks** or **Hooks** under the database section.

Official docs also link from: [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) → “Create a new Database Webhook” (Dashboard).

---

## Part 2 — What every webhook has in common

For **each** of the three webhooks below, you will set:

| Field | What to put |
|--------|-------------|
| **Name** | Any label you recognise (see names below). |
| **Table** | Either `casework_messages` or `casework_cases` (schema **`public`**). |
| **Events** | Only the checkboxes we say (Insert and/or Update). |
| **HTTP method** | **POST** |
| **URL** | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/casework-push` (same every time). |
| **HTTP Headers** | You **must** add a custom header so your function accepts the request (see below). |

### The secret header (required)

Your Edge Function checks the header **`x-casework-secret`**. It must match **`CASEWORK_PUSH_SECRET`** exactly.

1. In the webhook form, find **HTTP Headers** (or **Headers**, or **Additional headers** — sometimes under **Advanced**).
2. Add **one** header:
   - **Name / key:** `x-casework-secret`  
   - **Value:** paste your **`CASEWORK_PUSH_SECRET`** (the same value you stored as a function secret).

**If you cannot find a Headers section** in your Dashboard version:

- Note the exact Supabase UI you see and check their docs for “Database Webhook headers”, **or**
- Ask in Agent mode to add a **SQL-based webhook** using `supabase_functions.http_request` with headers in the third argument (your team can generate that SQL for your project ref and secret).

### Optional: Authorization header (only if the function returns 401 “JWT” before your code runs)

If you **did not** deploy with `--no-verify-jwt`, Supabase may require a JWT on the request. Prefer redeploying with:

`supabase functions deploy casework-push --no-verify-jwt`

If you must add a header:

- **Name:** `Authorization`  
- **Value:** `Bearer YOUR_ANON_KEY`  
  (`YOUR_ANON_KEY` = **Project Settings → API →** `anon` `public` key.)

Your function still **also** needs **`x-casework-secret`** for its own check.

---

## Webhook 1 — New casework messages

1. Click **Create / Add webhook**.
2. **Name:** e.g. `casework_messages_insert`
3. **Schema:** `public`
4. **Table:** `casework_messages`
5. **Events:** enable **Insert** only (turn **off** Update and Delete unless you know you need them).
6. **Request type:** HTTP Request (or equivalent).
7. **Method:** POST
8. **URL:**  
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/casework-push`
9. **Headers:** add `x-casework-secret` = your secret (see above).
10. **Save** / **Create**.

---

## Webhook 2 — New casework cases

1. **Create / Add webhook** again (second row).
2. **Name:** e.g. `casework_cases_insert`
3. **Schema:** `public`
4. **Table:** `casework_cases`
5. **Events:** **Insert** only.
6. **Method:** POST  
7. **URL:** same as webhook 1.  
8. **Headers:** same `x-casework-secret`.  
9. **Save**.

---

## Webhook 3 — Casework case updates (status changes)

1. **Create / Add webhook** again (third row).
2. **Name:** e.g. `casework_cases_update`
3. **Schema:** `public`
4. **Table:** `casework_cases`
5. **Events:** **Update** only (not Insert — webhook 2 already handles new rows).
6. **Method:** POST  
7. **URL:** same as webhook 1.  
8. **Headers:** same `x-casework-secret`.  
9. **Save**.

---

## Part 3 — Check that it works

1. **Edge Function logs**  
   **Project → Edge Functions → casework-push → Logs**  
   Send a test message on a case in the app, then refresh logs. You should see requests when rows are inserted/updated.

2. **Webhook / net logs (if available)**  
   Some projects log under **Database →** webhook history or the docs mention the **`net`** schema. If something fails, open **Edge Function logs** first — they usually show the error.

3. **Wrong secret**  
   If logs show `401` / `unauthorized`, the header name must be exactly **`x-casework-secret`** (lowercase `x`, hyphens) and the value must match **`CASEWORK_PUSH_SECRET`** in function secrets.

4. **No push on phone**  
   Confirm **Table Editor → `member_devices`** has a row for your test user with an `ExponentPushToken[...]` value, and that notifications are allowed on the device.

---

## Quick checklist

- [ ] Webhook 1: `casework_messages` → **Insert** → POST → function URL → `x-casework-secret`
- [ ] Webhook 2: `casework_cases` → **Insert** → POST → same URL → same header  
- [ ] Webhook 3: `casework_cases` → **Update** → POST → same URL → same header  
- [ ] Function deployed with `--no-verify-jwt` (recommended for webhooks)  
- [ ] `CASEWORK_PUSH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` set for the function  

---

## Payload shape (for debugging)

Your function expects JSON like:

**Insert:** `{ "type": "INSERT", "table": "...", "record": { ... }, "old_record": null }`  
**Update:** `{ "type": "UPDATE", "table": "...", "record": { ... }, "old_record": { ... } }`

The code in [`supabase/functions/casework-push/index.ts`](../supabase/functions/casework-push/index.ts) also accepts a wrapper `{ "payload": { ... } }` if your project sends that.
