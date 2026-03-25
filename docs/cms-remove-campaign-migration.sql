-- Remove CMS `campaign` type (app no longer uses it). Run in Supabase SQL Editor on existing projects.
-- Order: rewrite rows, drop check, add check without `campaign`.

update public.cms_posts
set type = 'news'
where type = 'campaign';

alter table public.cms_posts
  drop constraint if exists cms_posts_type_check;

alter table public.cms_posts
  add constraint cms_posts_type_check check (type in ('news', 'library'));
