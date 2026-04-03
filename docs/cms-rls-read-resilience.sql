-- CMS read resilience: front-page announcements stay readable even if public.members RLS breaks.
-- Previously, one SELECT policy used (announcement OR exists(members…)); Postgres can still evaluate
-- the members subquery and fail the entire cms_posts query (e.g. members RLS recursion).
--
-- Run in Supabase SQL Editor. Safe to re-run.

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
