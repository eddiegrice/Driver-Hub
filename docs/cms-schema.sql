-- CMS: articles for News and Library (and later Petitions, Polls).
-- Run in Supabase SQL Editor. Admin (or Table Editor) inserts/updates; app reads by type.
-- Type is `news` or `library`. Existing DBs with `campaign` rows: run `cms-remove-campaign-migration.sql` first.

create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('news', 'library')),
  title text not null,
  body text not null default '',
  excerpt text,
  thumbnail_url text,
  author_name text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- When true (news only in app): tile on home for all signed-in users; full article readable without premium.
  is_front_page_announcement boolean not null default false
);

create index if not exists idx_cms_posts_type_published_at
  on public.cms_posts (type, published_at desc);

create index if not exists idx_cms_posts_front_page_news
  on public.cms_posts (published_at desc)
  where type = 'news' and is_front_page_announcement = true;

alter table public.cms_posts enable row level security;

-- Read membership check without querying members under caller RLS (avoids breaking cms_posts when members RLS misbehaves).
create or replace function public.is_current_membership_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select lower(trim(m.membership_status::text)) = 'active'
      from public.members m
      where m.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_current_membership_active() from public;
grant execute on function public.is_current_membership_active() to authenticated;

-- Read: two permissive policies so front-page rows never depend on evaluating a failing members subquery.
drop policy if exists "Members can read cms_posts" on public.cms_posts;
drop policy if exists "CMS read: front-page announcements" on public.cms_posts;
drop policy if exists "CMS read: active members all posts" on public.cms_posts;

create policy "CMS read: front-page announcements"
  on public.cms_posts for select
  using (
    auth.uid() is not null
    and type = 'news'
    and is_front_page_announcement = true
  );

create policy "CMS read: active members all posts"
  on public.cms_posts for select
  using (auth.uid() is not null and public.is_current_membership_active());

-- App admins (members.is_admin): insert/update rows from the in-app Admin Panel.
drop policy if exists "Admins can insert cms_posts" on public.cms_posts;
create policy "Admins can insert cms_posts"
  on public.cms_posts for insert
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

drop policy if exists "Admins can update cms_posts" on public.cms_posts;
create policy "Admins can update cms_posts"
  on public.cms_posts for update
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.is_admin = true
    )
  );

-- Delete: still service role / SQL Editor unless you add an admin delete policy later.

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

-- Normalize type to lowercase so Table Editor accepts "News", "Library"
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
