-- CMS: articles for News, Campaigns, Library (and later Petitions, Polls).
-- Run in Supabase SQL Editor. Admin (or Table Editor) inserts/updates; app reads by type.
-- One publishing screen: admin selects type (news | campaign | library); article appears in the right app section.

create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('news', 'campaign', 'library')),
  title text not null,
  body text not null default '',
  excerpt text,
  thumbnail_url text,
  author_name text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cms_posts_type_published_at
  on public.cms_posts (type, published_at desc);

alter table public.cms_posts enable row level security;

-- Membership-only read: only active members can read premium CMS posts.
drop policy if exists "Members can read cms_posts" on public.cms_posts;
create policy "Members can read cms_posts"
  on public.cms_posts for select
  using (
    exists (
      select 1
      from public.members m
      where m.id = auth.uid()
        and m.membership_status = 'active'
    )
  );

-- Insert/update/delete: use service role (admin panel or Supabase dashboard). No policy for anon/authenticated.

-- Trigger: keep updated_at in sync
create or replace function public.set_cms_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cms_posts_updated_at on public.cms_posts;
create trigger cms_posts_updated_at
  before update on public.cms_posts
  for each row execute function public.set_cms_posts_updated_at();

-- Normalize type to lowercase so Table Editor accepts "News", "Campaign", "Library"
create or replace function public.cms_posts_normalize_type()
returns trigger as $$
begin
  new.type = lower(trim(new.type));
  return new;
end;
$$ language plpgsql;

drop trigger if exists cms_posts_normalize_type on public.cms_posts;
create trigger cms_posts_normalize_type
  before insert or update on public.cms_posts
  for each row execute function public.cms_posts_normalize_type();
