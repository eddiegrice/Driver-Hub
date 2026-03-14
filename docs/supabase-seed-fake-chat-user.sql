-- Seed one fake chat user + a few messages (for testing the app as "you" talking to "Alex")
-- Run this once in Supabase → SQL Editor. You stay logged in as yourself; the app will show Alex's messages.
-- To remove later: delete from chat_messages where member_id = '11111111-2222-4333-8444-555555555555'; then from members; then auth.identities; then auth.users.

create extension if not exists pgcrypto;

-- 1) Create a fake auth user (so we can have a member that references it)
--    Use a fixed UUID so we can reference it below.
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '11111111-2222-4333-8444-555555555555'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'alex.fake@phdmatrix.local',
  crypt('not-used', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2) Link the auth user to the "email" identity (required by Supabase Auth)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
) VALUES (
  '11111111-2222-4333-8444-555555555555'::uuid,
  '11111111-2222-4333-8444-555555555555'::uuid,
  jsonb_build_object('sub', '11111111-2222-4333-8444-555555555555'::text, 'email', 'alex.fake@phdmatrix.local'),
  'email',
  '11111111-2222-4333-8444-555555555555'::text,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3) Create the member row (so chat_messages can reference it)
INSERT INTO public.members (id, email, name, membership_status)
VALUES (
  '11111111-2222-4333-8444-555555555555'::uuid,
  'alex.fake@phdmatrix.local',
  'Alex',
  'active'
) ON CONFLICT (id) DO UPDATE SET name = 'Alex', membership_status = 'active';

-- 4) Insert a few messages from "Alex" so you see another person in the chat
INSERT INTO public.chat_messages (room_id, member_id, display_name, body, created_at)
VALUES
  ('main', '11111111-2222-4333-8444-555555555555', 'Alex', 'Hi, is anyone there?', now() - interval '2 hours'),
  ('main', '11111111-2222-4333-8444-555555555555', 'Alex', 'Just testing the chat from the database.', now() - interval '1 hour 50 min'),
  ('main', '11111111-2222-4333-8444-555555555555', 'Alex', 'You should see these on the left with my name above them.', now() - interval '1 hour 45 min');
