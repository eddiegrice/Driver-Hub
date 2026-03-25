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

-- Read: active members see all posts; any signed-in user sees rows flagged as front-page announcements.
drop policy if exists "Members can read cms_posts" on public.cms_posts;
create policy "Members can read cms_posts"
  on public.cms_posts for select
  using (
    auth.uid() is not null
    and (
      is_front_page_announcement = true
      or exists (
        select 1
        from public.members m
        where m.id = auth.uid()
          and m.membership_status = 'active'
      )
    )
  );

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
