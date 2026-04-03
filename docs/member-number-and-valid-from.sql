-- One-time migration:
-- 1) Add sequential membership numbers for all users (including basic/free users)
-- 2) Auto-assign next membership number on auth signup
-- 3) Add paid subscription start date for e-card "Valid From"
--
-- Safe to re-run.

alter table public.members
  add column if not exists subscription_started_at date;

create sequence if not exists public.membership_number_seq as bigint start with 1 increment by 1;

-- Backfill blank membership numbers deterministically by created_at then id.
with numbered as (
  select
    m.id,
    row_number() over (order by m.created_at asc, m.id asc) as rn
  from public.members m
  where coalesce(trim(m.membership_number), '') = ''
)
update public.members m
set membership_number = lpad(numbered.rn::text, 4, '0')
from numbered
where m.id = numbered.id;

-- Ensure sequence starts after current highest numeric membership number.
select setval(
  'public.membership_number_seq',
  greatest(
    coalesce((select max(nullif(regexp_replace(membership_number, '\D', '', 'g'), '')::bigint) from public.members), 0),
    0
  ),
  true
);

create or replace function public.handle_new_user()
returns trigger as $$
declare
  next_member_number bigint;
begin
  next_member_number := nextval('public.membership_number_seq');

  insert into public.members (id, email, membership_number)
  values (new.id, new.email, lpad(next_member_number::text, 4, '0'))
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
