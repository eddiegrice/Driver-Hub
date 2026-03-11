-- DriverHub Supabase schema: members + membership (Phase 1)
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for admin: list members by status, migration pending
create index if not exists idx_members_membership_status on public.members(membership_status);
create index if not exists idx_members_migration_status on public.members(migration_status) where migration_status is not null;

-- RLS: members can read and update their own row only
alter table public.members enable row level security;

create policy "Users can read own member row"
  on public.members for select
  using (auth.uid() = id);

create policy "Users can update own member row"
  on public.members for update
  using (auth.uid() = id);

-- Insert is done by the app or trigger when user signs up (users cannot insert arbitrary rows)
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
