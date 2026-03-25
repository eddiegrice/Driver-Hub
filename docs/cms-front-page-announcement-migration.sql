-- Front page announcements (run in Supabase SQL Editor on existing projects).
-- Extends cms_posts with one boolean; adjusts RLS so any signed-in user can read
-- rows where is_front_page_announcement = true; active members still read all posts.

alter table public.cms_posts
  add column if not exists is_front_page_announcement boolean not null default false;

create index if not exists idx_cms_posts_front_page_news
  on public.cms_posts (published_at desc)
  where type = 'news' and is_front_page_announcement = true;

-- Replace read policy: authenticated users see (a) all posts if membership active, or (b) announcement rows only.
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
