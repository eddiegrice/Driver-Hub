# Casework push notifications (Expo)

The app registers device tokens in `member_devices` (see `lib/push-device-supabase.ts`). To send pushes when casework events happen, deploy an Edge Function and wire **Database Webhooks** in Supabase.

## 1. SQL and Realtime

- Run `docs/casework-schema.md` (SQL block) or `docs/casework-schema.sql` in the SQL Editor.
- **Database → Replication:** add `casework_cases`, `casework_messages`, and `casework_attachments` to the `supabase_realtime` publication so the app receives live updates.

## 2. Edge Function `casework-push`

The implementation lives in [`supabase/functions/casework-push/index.ts`](../supabase/functions/casework-push/index.ts).

**Plain-language walkthrough of what that code does (Part E):** see [`docs/casework-push-part-e-explained.md`](casework-push-part-e-explained.md).

Summary:

1. Verifies `x-casework-secret` against `CASEWORK_PUSH_SECRET`.
2. Parses the webhook JSON (`INSERT` / `UPDATE` on `casework_cases` or `casework_messages`).
3. Uses the **service role** client to load related rows and `member_devices` push tokens.
4. Calls the [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/) in batches.

**Behaviour (matches product rules):**

- **Member:** push when staff posts a message on their case; when case `status` changes; when a case is created for them (`opened_by_admin` + `member_id`).
- **Admins:** push when a member opens a case or posts a message; internal cases notify other admins on new messages / new internal case.

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CASEWORK_PUSH_SECRET`, optional `EXPO_ACCESS_TOKEN`.

## 3. Database Webhooks

**Detailed click-by-click instructions:** [`docs/casework-database-webhooks-steps.md`](casework-database-webhooks-steps.md)

Summary — create **three** webhooks, all **POST** to  
`https://<PROJECT_REF>.supabase.co/functions/v1/casework-push`  
with header **`x-casework-secret`** = your `CASEWORK_PUSH_SECRET`:

| # | Table              | Event(s) |
|---|--------------------|----------|
| 1 | `casework_messages`| **Insert** only |
| 2 | `casework_cases`   | **Insert** only |
| 3 | `casework_cases`   | **Update** only |

In the Dashboard: **Integrations → Webhooks** (or **Database → Webhooks**). See the linked doc if your menu labels differ.

## 4. App behaviour

In-app updates use **Supabase Realtime** from `CaseworkContext`. Push is optional until the webhooks and function are live.
