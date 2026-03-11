# Fake chat conversation for testing

To see a back-and-forth conversation in the app, you can insert test messages directly in Supabase. The app uses the **chat_messages** table; each row needs a real **member_id** (from **members**).

## Option A: Two accounts (recommended)

1. **Create a second member**  
   Sign up in the app (or in Supabase Auth) with a different email (e.g. a spare Gmail or `you+test@gmail.com`).  
   That creates a row in **members**. You now have two members: you and “Test”.

2. **Get both member IDs**  
   In Supabase: **Table Editor** → **members**.  
   Copy the **id** (UUID) for:
   - your account
   - the test account  

3. **Run the seed script in SQL Editor**  
   In **SQL Editor** → **New query**, paste the script below.  
   Replace:
   - `YOUR_MEMBER_ID` = your own **members.id** (UUID)
   - `OTHER_MEMBER_ID` = the test account’s **members.id** (UUID)  
   Then run the query.

```sql
-- Replace the two UUIDs with your real member IDs from Table Editor → members
\set your_id 'YOUR_MEMBER_ID'
\set other_id 'OTHER_MEMBER_ID'

-- Supabase SQL Editor doesn't support \set, so do a find-replace:
-- Replace YOUR_MEMBER_ID with your id, OTHER_MEMBER_ID with the other member's id, then run.

INSERT INTO public.chat_messages (room_id, member_id, display_name, body, created_at)
VALUES
  ('main', 'OTHER_MEMBER_ID', 'Alex', 'Hi, is anyone there?', now() - interval '2 hours'),
  ('main', 'YOUR_MEMBER_ID', 'You', 'Hi Alex! Yeah, just testing the chat.', now() - interval '1 hour 55 min'),
  ('main', 'OTHER_MEMBER_ID', 'Alex', 'Looks good. Can you see my name on the message?', now() - interval '1 hour 50 min'),
  ('main', 'YOUR_MEMBER_ID', 'You', 'Yes, your name shows above the bubble.', now() - interval '1 hour 48 min'),
  ('main', 'OTHER_MEMBER_ID', 'Alex', 'Great. Try swiping right on this to reply.', now() - interval '1 hour 45 min');
```

**Find-replace before running:**  
Replace `YOUR_MEMBER_ID` with your **members.id** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).  
Replace `OTHER_MEMBER_ID` with the test account’s **members.id**.

So the script might look like:

```sql
INSERT INTO public.chat_messages (room_id, member_id, display_name, body, created_at)
VALUES
  ('main', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alex', 'Hi, is anyone there?', now() - interval '2 hours'),
  ('main', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'You', 'Hi Alex! Yeah, just testing the chat.', now() - interval '1 hour 55 min'),
  ('main', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alex', 'Looks good. Can you see my name on the message?', now() - interval '1 hour 50 min'),
  ('main', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'You', 'Yes, your name shows above the bubble.', now() - interval '1 hour 48 min'),
  ('main', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Alex', 'Great. Try swiping right on this to reply.', now() - interval '1 hour 45 min');
```

(Use your real UUIDs from the **members** table.)

## Option B: One account only (your messages only)

If you don’t want a second account, you can only insert messages as yourself:

1. **Table Editor** → **members** → copy your row’s **id**.
2. **SQL Editor** → run something like:

```sql
INSERT INTO public.chat_messages (room_id, member_id, display_name, body, created_at)
VALUES
  ('main', 'YOUR_MEMBER_ID', 'You', 'First message', now() - interval '1 hour'),
  ('main', 'YOUR_MEMBER_ID', 'You', 'Second message', now() - interval '30 min');
```

Replace `YOUR_MEMBER_ID` with your **members.id**. You’ll only see your own messages; there’s no “other” person unless you have a second member (Option A).

## Option C: Fake user in the DB (no second account)

Stay logged in as yourself and still see another user's messages by creating a fake user and messages in the database:

1. **Supabase** → **SQL Editor** → **New query**.
2. Paste and run the script in **`docs/supabase-seed-fake-chat-user.sql`**.

That creates a fake auth user "Alex", a **members** row for them, and a few **chat_messages** from Alex. Reload the app and you'll see Alex's messages on the left with your messages on the right. To remove later, delete from **chat_messages** (where `member_id = '11111111-2222-4333-8444-555555555555'`), then **members**, then **auth.identities**, then **auth.users** for that UUID.

## After inserting

Reload the app and open **Chat**. The new rows will appear (and Realtime will show them if the app is already open). To clear test data later, delete the rows from **Table Editor** → **chat_messages** or run:

```sql
DELETE FROM public.chat_messages WHERE body LIKE '%testing%' OR body LIKE '%Hi Alex%';
```

(Adjust the `WHERE` clause to match the bodies you used.)
