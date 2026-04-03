# Casework database schema

Run the SQL below in the Supabase SQL Editor, or extract `casework-schema.sql` with:

`python scripts/extract-sql-from-md.py docs/casework-schema.md docs/casework-schema.sql`

```sql
-- Casework: cases, messages, attachments + Storage. Run in Supabase SQL Editor.
-- Enable Realtime on casework_cases, casework_messages, casework_attachments.
-- See docs/casework-push-setup.md for push webhooks.

drop policy if exists "Admins can read all members for casework" on public.members;
create policy "Admins can read all members for casework"
  on public.members for select
  using (
    exists (
      select 1 from public.members self
      where self.id = auth.uid() and self.is_admin = true
    )
  );

create table if not exists public.casework_cases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  case_type text not null check (case_type in (
    'PHDL (Badge) Issue',
    'PHCL (Plate) Issue',
    'Medical Related',
    'Cars and Inspections',
    'Hearings and Enforcement',
    'Something Else'
  )),
  subject text not null default '',
  status text not null default 'case_open' check (status in (
    'case_open',
    'investigating',
    'actioning',
    'closed_no_resolution',
    'closed_resolved'
  )),
  assigned_admin_id uuid references public.members(id) on delete set null,
  closure_requested boolean not null default false,
  opened_by_admin boolean not null default false,
  created_by_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_casework_cases_member_updated
  on public.casework_cases (member_id, updated_at desc);
create index if not exists idx_casework_cases_status_updated
  on public.casework_cases (status, updated_at desc);

create table if not exists public.casework_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.casework_cases(id) on delete cascade,
  author_member_id uuid not null references public.members(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_casework_messages_case_created
  on public.casework_messages (case_id, created_at asc);

create table if not exists public.casework_attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.casework_cases(id) on delete cascade,
  message_id uuid references public.casework_messages(id) on delete set null,
  storage_path text not null,
  file_name text,
  mime_type text,
  byte_size bigint,
  uploaded_by uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_casework_attachments_case
  on public.casework_attachments (case_id);

drop trigger if exists casework_cases_updated_at on public.casework_cases;
create trigger casework_cases_updated_at
  before update on public.casework_cases
  for each row execute function public.set_updated_at();

create or replace function public.casework_bump_case_on_message()
returns trigger as $$
begin
  update public.casework_cases set updated_at = now() where id = new.case_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists casework_messages_bump_case on public.casework_messages;
create trigger casework_messages_bump_case
  after insert on public.casework_messages
  for each row execute function public.casework_bump_case_on_message();

create or replace function public.casework_request_closure(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.casework_cases
  set closure_requested = true, updated_at = now()
  where id = p_case_id
    and member_id = auth.uid()
    and status not in ('closed_no_resolution', 'closed_resolved');
end;
$$;

grant execute on function public.casework_request_closure(uuid) to authenticated;

alter table public.casework_cases enable row level security;
alter table public.casework_messages enable row level security;
alter table public.casework_attachments enable row level security;

drop policy if exists "Casework cases: member sees own" on public.casework_cases;
create policy "Casework cases: member sees own"
  on public.casework_cases for select
  using (auth.uid() is not null and member_id is not null and member_id = auth.uid());

drop policy if exists "Casework cases: admins see all" on public.casework_cases;
create policy "Casework cases: admins see all"
  on public.casework_cases for select
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true));

drop policy if exists "Casework cases: member creates own" on public.casework_cases;
create policy "Casework cases: member creates own"
  on public.casework_cases for insert
  with check (
    auth.uid() is not null
    and member_id = auth.uid()
    and created_by_id = auth.uid()
    and opened_by_admin = false
  );

drop policy if exists "Casework cases: admin creates" on public.casework_cases;
create policy "Casework cases: admin creates"
  on public.casework_cases for insert
  with check (
    exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
    and created_by_id = auth.uid()
  );

drop policy if exists "Casework cases: admin updates" on public.casework_cases;
create policy "Casework cases: admin updates"
  on public.casework_cases for update
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true));

drop policy if exists "Casework messages: via case as member" on public.casework_messages;
create policy "Casework messages: via case as member"
  on public.casework_messages for select
  using (
    exists (
      select 1 from public.casework_cases c
      where c.id = casework_messages.case_id
        and c.member_id is not null
        and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework messages: admins" on public.casework_messages;
create policy "Casework messages: admins"
  on public.casework_messages for select
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true));

drop policy if exists "Casework messages: member on own case" on public.casework_messages;
create policy "Casework messages: member on own case"
  on public.casework_messages for insert
  with check (
    author_member_id = auth.uid()
    and exists (
      select 1 from public.casework_cases c
      where c.id = case_id and c.member_id is not null and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework messages: admin on any case" on public.casework_messages;
create policy "Casework messages: admin on any case"
  on public.casework_messages for insert
  with check (
    author_member_id = auth.uid()
    and exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
    and exists (select 1 from public.casework_cases c where c.id = case_id)
  );

drop policy if exists "Casework attachments: via case member" on public.casework_attachments;
create policy "Casework attachments: via case member"
  on public.casework_attachments for select
  using (
    exists (
      select 1 from public.casework_cases c
      where c.id = casework_attachments.case_id
        and c.member_id is not null
        and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework attachments: admins" on public.casework_attachments;
create policy "Casework attachments: admins"
  on public.casework_attachments for select
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true));

drop policy if exists "Casework attachments: member on own case" on public.casework_attachments;
create policy "Casework attachments: member on own case"
  on public.casework_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.casework_cases c
      where c.id = case_id and c.member_id is not null and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework attachments: admin" on public.casework_attachments;
create policy "Casework attachments: admin"
  on public.casework_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
    and exists (select 1 from public.casework_cases c where c.id = case_id)
  );

insert into storage.buckets (id, name, public)
values ('casework-attachments', 'casework-attachments', false)
on conflict (id) do nothing;

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
          or exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
        )
    )
  );

drop policy if exists "Casework storage upload member" on storage.objects;
create policy "Casework storage upload member"
  on storage.objects for insert
  with check (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
        and c.member_id is not null
        and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework storage upload admin" on storage.objects;
create policy "Casework storage upload admin"
  on storage.objects for insert
  with check (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
    )
  );

drop policy if exists "Casework storage update member" on storage.objects;
create policy "Casework storage update member"
  on storage.objects for update
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
        and c.member_id is not null
        and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework storage update admin" on storage.objects;
create policy "Casework storage update admin"
  on storage.objects for update
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
  );

drop policy if exists "Casework storage delete member" on storage.objects;
create policy "Casework storage delete member"
  on storage.objects for delete
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (
      select 1 from public.casework_cases c
      where c.id = split_part(name, '/', 1)::uuid
        and c.member_id is not null
        and c.member_id = auth.uid()
    )
  );

drop policy if exists "Casework storage delete admin" on storage.objects;
create policy "Casework storage delete admin"
  on storage.objects for delete
  using (
    bucket_id = 'casework-attachments'
    and auth.uid() is not null
    and exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin = true)
  );
```
