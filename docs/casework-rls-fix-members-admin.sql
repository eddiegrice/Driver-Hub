-- One-shot fix: casework RLS used self-referential subqueries on public.members, which can
-- break member reads (infinite recursion / failed policy evaluation) and leave the app
-- thinking you are inactive even when membership_status and is_admin are correct.
--
-- Run in Supabase SQL Editor (same project as the app). Safe to re-run.

-- 1) Admin check without querying members under the caller's RLS stack
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

-- 2) Ensure every member can always read their own row
drop policy if exists "Users can read own member row" on public.members;
create policy "Users can read own member row"
  on public.members for select
  using (auth.uid() = id);

-- 3) Admins may read all members (for casework / assignment UIs)
drop policy if exists "Admins can read all members for casework" on public.members;
create policy "Admins can read all members for casework"
  on public.members for select
  using (public.is_current_user_admin());

-- 4) Casework + storage: replace self-referential members subqueries
drop policy if exists "Casework cases: admins see all" on public.casework_cases;
create policy "Casework cases: admins see all"
  on public.casework_cases for select
  using (public.is_current_user_admin());

drop policy if exists "Casework cases: admin creates" on public.casework_cases;
create policy "Casework cases: admin creates"
  on public.casework_cases for insert
  with check (
    public.is_current_user_admin()
    and created_by_id = auth.uid()
  );

drop policy if exists "Casework cases: admin updates" on public.casework_cases;
create policy "Casework cases: admin updates"
  on public.casework_cases for update
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "Casework messages: admins" on public.casework_messages;
create policy "Casework messages: admins"
  on public.casework_messages for select
  using (public.is_current_user_admin());

drop policy if exists "Casework messages: admin on any case" on public.casework_messages;
create policy "Casework messages: admin on any case"
  on public.casework_messages for insert
  with check (
    author_member_id = auth.uid()
    and public.is_current_user_admin()
    and exists (select 1 from public.casework_cases c where c.id = case_id)
  );

drop policy if exists "Casework attachments: admins" on public.casework_attachments;
create policy "Casework attachments: admins"
  on public.casework_attachments for select
  using (public.is_current_user_admin());

drop policy if exists "Casework attachments: admin" on public.casework_attachments;
create policy "Casework attachments: admin"
  on public.casework_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and public.is_current_user_admin()
    and exists (select 1 from public.casework_cases c where c.id = case_id)
  );

drop policy if exists "Casework storage read" on storage.objects;
create policy "Casework storage read"
  on storage.objects for select
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
        and (
          (c.member_id is not null and c.member_id = auth.uid())
          or public.is_current_user_admin()
        )
    )
  );

drop policy if exists "Casework storage upload admin" on storage.objects;
create policy "Casework storage upload admin"
  on storage.objects for insert
  with check (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and public.is_current_user_admin()
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
    )
  );

drop policy if exists "Casework storage update admin" on storage.objects;
create policy "Casework storage update admin"
  on storage.objects for update
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and public.is_current_user_admin()
  );

drop policy if exists "Casework storage delete admin" on storage.objects;
create policy "Casework storage delete admin"
  on storage.objects for delete
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and public.is_current_user_admin()
  );
