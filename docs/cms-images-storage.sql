-- CMS images (thumbnails / header images)
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Creates a public bucket `cms-images` and allows admins (members.is_admin) to upload/update/delete.
-- Reads are public via bucket setting (so thumbnails load for all signed-in users without signed URLs).

-- Admin check helper (RLS-safe)
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select m.is_admin from public.members m where m.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

insert into storage.buckets (id, name, public)
values ('cms-images', 'cms-images', true)
on conflict (id) do update set public = true;

-- Admin-only writes to cms-images bucket
drop policy if exists "CMS images: admin upload" on storage.objects;
create policy "CMS images: admin upload"
  on storage.objects for insert
  to public
  with check (
    bucket_id = 'cms-images'
    and auth.role() = 'authenticated'
    and auth.uid() is not null
    and public.is_current_user_admin()
  );

drop policy if exists "CMS images: admin update" on storage.objects;
create policy "CMS images: admin update"
  on storage.objects for update
  to public
  using (
    bucket_id = 'cms-images'
    and auth.role() = 'authenticated'
    and auth.uid() is not null
    and public.is_current_user_admin()
  );

drop policy if exists "CMS images: admin delete" on storage.objects;
create policy "CMS images: admin delete"
  on storage.objects for delete
  to public
  using (
    bucket_id = 'cms-images'
    and auth.role() = 'authenticated'
    and auth.uid() is not null
    and public.is_current_user_admin()
  );

