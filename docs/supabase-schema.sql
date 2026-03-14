-- PHD Matrix Supabase schema: members + membership (Phase 1)
-- Run this in the Supabase SQL Editor after creating your project (UK/EU region).
-- See docs/supabase-setup.md for step-by-step instructions.

-- Members table: one row per auth user. id = auth.uid().
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  -- Profile (matches app MemberProfile)
  name text not null default '',
  badge_number text not null default '',
  badge_expiry date,
  vehicle_registration text not null default '',
  vehicle_make text not null default '',
  vehicle_model text not null default '',
  plate_number text not null default '',
  plate_expiry date,
  membership_number text not null default '',
  membership_status text not null default 'pending' check (membership_status in ('active', 'expired', 'pending')),
  membership_expiry date,
  -- Membership source: app_store (from IAP) or legacy (pre-app migration)
  membership_source text not null default 'app_store' check (membership_source in ('app_store', 'legacy')),
  -- Legacy: pre-app members; active until this date without App Store subscription
  legacy_active_until date,
  -- From App Store (when we add IAP): when subscription is valid until
  subscription_active_until date,
  -- Migration flow: pending_migration = requested legacy; approved = admin set legacy; declined = admin declined
  migration_status text check (migration_status in ('pending_migration', 'approved', 'declined')),
  -- Chat / moderation
  is_chat_moderator boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for admin: list members by status, migration pending
create index if not exists idx_members_membership_status on public.members(membership_status);
create index if not exists idx_members_migration_status on public.members(migration_status) where migration_status is not null;

-- Add chat moderator column if this script is re-run after members table already existed
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'is_chat_moderator') then
    alter table public.members add column is_chat_moderator boolean not null default false;
  end if;
end $$;

-- RLS: members can read and update their own row only
alter table public.members enable row level security;

drop policy if exists "Users can read own member row" on public.members;
create policy "Users can read own member row"
  on public.members for select
  using (auth.uid() = id);

drop policy if exists "Users can update own member row" on public.members;
create policy "Users can update own member row"
  on public.members for update
  using (auth.uid() = id);

-- Insert is done by the app or trigger when user signs up (users cannot insert arbitrary rows)
drop policy if exists "Users can insert own member row" on public.members;
create policy "Users can insert own member row"
  on public.members for insert
  with check (auth.uid() = id);

-- Admin: use service role key for admin operations (bypasses RLS). No policy needed for that.

-- Trigger: keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- Optional: create a member row when a new user signs up (so app doesn't have to)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.members (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Chat: single-room group chat with reactions and moderation
-- ---------------------------------------------------------------------------
-- If you already had the members table before chat was added, run this once:
-- alter table public.members add column if not exists is_chat_moderator boolean not null default false;

-- Messages posted into the global chat room.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'main',
  member_id uuid not null references public.members(id) on delete cascade,
  display_name text not null default '',
  body text not null,
  quoted_message_id uuid references public.chat_messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_room_created_at
  on public.chat_messages (room_id, created_at desc);

-- Reactions (emoji) on messages.
create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_reactions_message_id
  on public.chat_reactions (message_id);

create unique index if not exists uidx_chat_reactions_message_member_emoji
  on public.chat_reactions (message_id, member_id, emoji);

-- Global room state: whether chat is temporarily locked by moderators.
create table if not exists public.chat_room_state (
  room_id text primary key,
  is_locked boolean not null default false,
  locked_reason text,
  updated_at timestamptz not null default now()
);

-- Seed the main room so members can post (RLS requires this row to allow inserts).
insert into public.chat_room_state (room_id, is_locked)
values ('main', false)
on conflict (room_id) do update set is_locked = excluded.is_locked;

-- Per-member bans from posting in chat.
create table if not exists public.chat_bans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_chat_bans_member_id
  on public.chat_bans (member_id);

-- Per-member read state: track last read message to jump to first unread.
create table if not exists public.chat_member_state (
  member_id uuid primary key references public.members(id) on delete cascade,
  last_read_message_id uuid references public.chat_messages(id),
  last_read_at timestamptz
);

-- Enable RLS
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_room_state enable row level security;
alter table public.chat_bans enable row level security;
alter table public.chat_member_state enable row level security;

-- Helper expression: is current user an active member?
-- (We inline this logic in policies to keep things simple.)

-- chat_messages policies
drop policy if exists "Chat: members can read messages" on public.chat_messages;
create policy "Chat: members can read messages"
  on public.chat_messages for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
  );

drop policy if exists "Chat: active, not-banned members can post" on public.chat_messages;
create policy "Chat: active, not-banned members can post"
  on public.chat_messages for insert
  with check (
    auth.uid() = member_id
    and exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
    and not exists (
      select 1 from public.chat_bans b
      where b.member_id = auth.uid()
        and (b.expires_at is null or b.expires_at > now())
    )
    and (
      exists (
        select 1 from public.chat_room_state s
        where s.room_id = room_id
          and s.is_locked = false
      )
      or exists (
        select 1 from public.members m2
        where m2.id = auth.uid()
          and m2.is_chat_moderator = true
      )
    )
  );

drop policy if exists "Chat: moderators can delete messages" on public.chat_messages;
create policy "Chat: moderators can delete messages"
  on public.chat_messages for delete
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.is_chat_moderator = true
    )
  );

-- chat_reactions policies
create policy "Chat: members can read reactions"
  on public.chat_reactions for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
  );

drop policy if exists "Chat: active members can react" on public.chat_reactions;
create policy "Chat: active members can react"
  on public.chat_reactions for insert
  with check (
    auth.uid() = member_id
    and exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
    and not exists (
      select 1 from public.chat_bans b
      where b.member_id = auth.uid()
        and (b.expires_at is null or b.expires_at > now())
    )
  );

drop policy if exists "Chat: users can remove own reactions" on public.chat_reactions;
create policy "Chat: users can remove own reactions"
  on public.chat_reactions for delete
  using (
    auth.uid() = member_id
  );

-- chat_room_state policies
drop policy if exists "Chat: members can read room state" on public.chat_room_state;
create policy "Chat: members can read room state"
  on public.chat_room_state for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
  );

drop policy if exists "Chat: moderators can manage room state" on public.chat_room_state;
create policy "Chat: moderators can manage room state"
  on public.chat_room_state for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.is_chat_moderator = true
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.is_chat_moderator = true
    )
  );

-- chat_bans policies
drop policy if exists "Chat: moderators manage bans" on public.chat_bans;
create policy "Chat: moderators manage bans"
  on public.chat_bans for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.is_chat_moderator = true
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.is_chat_moderator = true
    )
  );

-- chat_member_state policies
drop policy if exists "Chat: user can read own chat state" on public.chat_member_state;
create policy "Chat: user can read own chat state"
  on public.chat_member_state for select
  using (auth.uid() = member_id);

drop policy if exists "Chat: user can upsert own chat state" on public.chat_member_state;
create policy "Chat: user can upsert own chat state"
  on public.chat_member_state for insert
  with check (auth.uid() = member_id);

drop policy if exists "Chat: user can update own chat state" on public.chat_member_state;
create policy "Chat: user can update own chat state"
  on public.chat_member_state for update
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

-- ---------------------------------------------------------------------------
-- Push notifications: device tokens for chat (and future) notifications
-- ---------------------------------------------------------------------------
create table if not exists public.member_devices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  push_token text not null,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, push_token)
);

create index if not exists idx_member_devices_member_id on public.member_devices(member_id);

alter table public.member_devices enable row level security;

drop policy if exists "Users can manage own devices" on public.member_devices;
create policy "Users can manage own devices"
  on public.member_devices for all
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);
