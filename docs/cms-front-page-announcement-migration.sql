-- Front page announcements (run in Supabase SQL Editor on existing projects).
-- Extends cms_posts with one boolean; adjusts RLS so any signed-in user can read
-- rows where is_front_page_announcement = true; active members still read all posts.

alter table public.cms_posts
  add column if not exists is_front_page_announcement boolean not null default false;

create index if not exists idx_cms_posts_front_page_news
  on public.cms_posts (published_at desc)
  where type = 'news' and is_front_page_announcement = true;

-- Read: split policies + security definer helper so front-page rows do not depend on members RLS
-- (single OR policy could still evaluate the members subquery and fail the whole cms_posts select).
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

-- App admins manage CMS from the mobile Admin Panel (authenticated, is_admin).
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
