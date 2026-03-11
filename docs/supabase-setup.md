# Supabase setup for DriverHub

Follow these steps once to create your backend. You’ll need a Supabase account (free tier is enough to start).

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose an **organization** (or create one).
4. Set:
   - **Name:** e.g. `driverhub`
   - **Database password:** choose a strong password and **save it somewhere safe** (you need it to connect to the DB).
   - **Region:** pick **London (eu-west-2)** or another **UK/EU** region so member data stays in the UK/EU.
5. Click **Create new project** and wait until it’s ready.

---

## 2. Run the database schema

1. In the Supabase dashboard, open your project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Open the file `docs/supabase-schema.sql` in this repo and copy its **entire** contents.
5. Paste into the SQL Editor and click **Run**.
6. You should see “Success. No rows returned.” (That’s normal.)

This creates the `members` table and security rules (RLS), and a trigger that creates a member row when someone signs up. If you already ran an older version of the schema, see the comment in `supabase-schema.sql` about adding `is_chat_moderator` to `members`, and run the chat section (or the full file) to add the chat tables.

**Chat and Realtime:** After the schema is applied, enable Realtime for the chat tables so new messages and reactions appear live:
1. Go to **Database** → **Replication** in the Supabase dashboard.
2. Find **public** and ensure **chat_messages** and **chat_reactions** (and optionally **chat_room_state**) are enabled for replication.

**Making someone a chat moderator:** In **Table Editor** → **members**, edit the member’s row and set **is_chat_moderator** to `true`. Only they will see the mod menu (three dots) in Club Chat and be able to delete messages, pause chat, and suspend members.

---

## 3. Get your API keys

1. In the Supabase dashboard, go to **Project Settings** (gear icon) → **API**.
2. You’ll see:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (long string under “Project API keys”)
3. Keep this page open; you’ll paste these into the app next.

---

## 4. Turn on Email auth and send a sign-in code (no link needed)

The app signs you in with a **sign-in code** you enter in the app (no magic link to tap). Supabase sends that code by email.

1. Go to **Authentication** → **Providers**.
2. Click **Email**. Ensure **Enable Email provider** is **on**.
3. Go to **Authentication** → **Email Templates**.
4. Click **Magic Link**.
5. Change the **Subject** to something like: `Your DriverHub sign-in code`.
6. Replace the **Body** with a short message that includes the code. For example:

   ```
   Your DriverHub sign-in code is:

   {{ .Token }}

   Enter this sign-in code in the app. The code expires in 1 hour.
   ```

   The important part is **`{{ .Token }}`** — that’s the sign-in code. Leave it exactly as above (with the spaces and the dot). Click **Save**.

Later you’ll add **Google** and **Apple** under Providers when you’re ready for production sign-in.

---

## 5. Add the keys to the app

1. In the project, go to the **mobile** folder.
2. Copy `.env.example` to a new file named **`.env`** (same folder as `.env.example`).
3. Open `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` = your **Project URL** from step 3.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your **anon public** key from step 3.
4. Save the file. **Do not commit `.env`** (it’s in `.gitignore`); it’s your secret config.

---

## 6. Run the app

1. In a terminal (Command Prompt on Windows), run:
   ```cmd
   cd c:\Users\eddie\Documents\DriverHubApp\mobile
   npm install
   npx expo start
   ```
2. Open the app in Expo Go. You should see the **sign-in** screen. Enter your email and tap **Send code**; check your inbox for the sign-in code, enter it in the app, and tap **Sign in with code**. You should then be signed in and see the main app.

**If the magic link still shows “localhost refused to connect”:** Make sure **Site URL** in step 4 is set to `mobile://auth/callback` (not a localhost URL). 
---

## If you don’t set up Supabase yet

If you don’t create a `.env` file or leave the URL/key empty, the app still runs and uses **local data only** (no sign-in). When you’re ready, add `.env` and the sign-in screen will appear.

---

## Summary

| Step | What you did |
|------|----------------|
| 1 | Created a Supabase project (UK/EU region). |
| 2 | Ran `docs/supabase-schema.sql` in the SQL Editor. |
| 3 | Copied Project URL and anon key. |
| 4 | Enabled Email auth (and later Google/Apple). |
| 5 | Created `mobile/.env` with URL and anon key. |
| 6 | Ran the app and signed in with the sign-in code. |

For the backend and product plan (auth, subscriptions, migration), see **docs/backend-and-product-plan.md**.

---

## When you need to approve a legacy member (until the admin app exists)

If someone taps **Request migration** in the app (existing club member), you need to approve them so they get access:

1. In the Supabase dashboard, go to **Table Editor** → **members**.
2. Find their row (use **email** or sort by **created_at** to see the latest).
3. Edit that row:
   - Set **membership_source** to `legacy`.
   - Set **legacy_active_until** to the date their current subscription ends (e.g. `2026-12-31`).
   - Set **migration_status** to `approved`.
   - Optionally set **membership_status** to `active`.
4. Save. The next time they open the app (or pull to refresh on the “Get access” screen), they’ll be marked active and see the main app.
