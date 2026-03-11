# Chat push notifications (future)

The app now registers device push tokens with Supabase when the user is signed in. Tokens are stored in **member_devices** (one row per member per device/token).

## Current setup

- **Table:** `member_devices` (member_id, push_token, platform, created_at, updated_at). RLS: users can only manage their own rows.
- **App:** When the user is active and signed in, the app requests notification permission (if not already granted), gets the Expo push token, and upserts it into `member_devices` via `lib/push-device-supabase.ts`.

## Sending pushes when a new chat message is posted

To send push notifications to all members when a new row is inserted into `chat_messages`:

1. **Option A – Supabase Edge Function (recommended)**  
   Create a function that is triggered by a database webhook (or by a Postgres trigger that calls `net.http_post` to your function URL). The function:
   - Receives the new message payload.
   - Queries `member_devices` for all push tokens (excluding the sender’s member_id if desired).
   - Calls the [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/) to send a notification to each token (or batches of tokens).

2. **Option B – Postgres trigger + external job**  
   Add a trigger on `chat_messages` that writes to a “pending_notifications” table. A cron job or external service reads that table and sends pushes via the Expo Push API, then marks rows as sent.

3. **Expo Push API**  
   You will need your Expo project ID and (for production) the correct credentials. See [Expo push notifications](https://docs.expo.dev/push-notifications/overview/).

Until one of these is implemented, new chat messages will only appear in-app via Realtime; no push is sent.
