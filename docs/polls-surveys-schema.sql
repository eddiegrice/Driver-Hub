-- Polls & surveys (unified instruments). Run in Supabase SQL Editor after members + is_current_user_admin exist.
-- Requires: public.members.is_admin and public.is_current_user_admin() (see docs/casework-schema.sql).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.poll_instrument_kind as enum ('poll', 'survey');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.poll_question_type as enum (
    'single_choice',
    'multiple_choice',
    'text_short',
    'text_long',
    'number'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.poll_instruments (
  id uuid primary key default gen_random_uuid(),
  kind public.poll_instrument_kind not null,
  title text not null,
  description text not null default '',
  publish_at timestamptz not null,
  close_at timestamptz not null,
  archived_at timestamptz,
  results_published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_instruments_close_after_publish check (close_at > publish_at)
);

create index if not exists idx_poll_instruments_kind on public.poll_instruments (kind);
create index if not exists idx_poll_instruments_publish on public.poll_instruments (publish_at);
create index if not exists idx_poll_instruments_archived on public.poll_instruments (archived_at)
  where archived_at is null;

create table if not exists public.poll_questions (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references public.poll_instruments (id) on delete cascade,
  sort_order int not null default 0,
  prompt text not null,
  question_type public.poll_question_type not null,
  allow_write_in boolean not null default false
);

create index if not exists idx_poll_questions_instrument on public.poll_questions (instrument_id, sort_order);

create table if not exists public.poll_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.poll_questions (id) on delete cascade,
  sort_order int not null default 0,
  label text not null,
  is_write_in_slot boolean not null default false
);

create index if not exists idx_poll_question_options_question on public.poll_question_options (question_id, sort_order);

create table if not exists public.poll_responses (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid not null references public.poll_instruments (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (instrument_id, member_id)
);

create index if not exists idx_poll_responses_instrument on public.poll_responses (instrument_id);

create table if not exists public.poll_response_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.poll_responses (id) on delete cascade,
  question_id uuid not null references public.poll_questions (id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  text_value text,
  number_value numeric,
  write_in_text text,
  unique (response_id, question_id)
);

create index if not exists idx_poll_response_answers_question on public.poll_response_answers (question_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists poll_instruments_updated_at on public.poll_instruments;
create trigger poll_instruments_updated_at
  before update on public.poll_instruments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Poll rules: only single_choice, no write-in on questions
-- ---------------------------------------------------------------------------
create or replace function public.poll_questions_enforce_kind_rules()
returns trigger
language plpgsql as $$
declare
  k public.poll_instrument_kind;
begin
  select pi.kind into k from public.poll_instruments pi where pi.id = new.instrument_id;
  if k = 'poll' then
    if new.question_type is distinct from 'single_choice' then
      raise exception 'Poll instruments may only use single_choice questions';
    end if;
    if new.allow_write_in then
      raise exception 'Poll instruments cannot enable write-in';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists poll_questions_enforce_kind on public.poll_questions;
create trigger poll_questions_enforce_kind
  before insert or update on public.poll_questions
  for each row execute function public.poll_questions_enforce_kind_rules();

create or replace function public.poll_options_enforce_poll_no_writein_slot()
returns trigger
language plpgsql as $$
declare
  k public.poll_instrument_kind;
begin
  select pi.kind into k
  from public.poll_questions pq
  join public.poll_instruments pi on pi.id = pq.instrument_id
  where pq.id = new.question_id;
  if k = 'poll' and new.is_write_in_slot then
    raise exception 'Polls cannot use write-in option slots';
  end if;
  return new;
end;
$$;

drop trigger if exists poll_options_enforce_kind on public.poll_question_options;
create trigger poll_options_enforce_kind
  before insert or update on public.poll_question_options
  for each row execute function public.poll_options_enforce_poll_no_writein_slot();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.poll_instruments enable row level security;
alter table public.poll_questions enable row level security;
alter table public.poll_question_options enable row level security;
alter table public.poll_responses enable row level security;
alter table public.poll_response_answers enable row level security;

-- Admins: full access
drop policy if exists "poll_instruments admin all" on public.poll_instruments;
create policy "poll_instruments admin all"
  on public.poll_instruments for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "poll_questions admin all" on public.poll_questions;
create policy "poll_questions admin all"
  on public.poll_questions for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "poll_question_options admin all" on public.poll_question_options;
create policy "poll_question_options admin all"
  on public.poll_question_options for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "poll_responses admin all" on public.poll_responses;
create policy "poll_responses admin all"
  on public.poll_responses for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists "poll_response_answers admin all" on public.poll_response_answers;
create policy "poll_response_answers admin all"
  on public.poll_response_answers for all
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- Members: read published, non-archived instruments
drop policy if exists "poll_instruments member select visible" on public.poll_instruments;
create policy "poll_instruments member select visible"
  on public.poll_instruments for select
  to authenticated
  using (
    archived_at is null
    and publish_at <= now()
  );

-- Members: read questions/options for visible instruments
drop policy if exists "poll_questions member select" on public.poll_questions;
create policy "poll_questions member select"
  on public.poll_questions for select
  to authenticated
  using (
    exists (
      select 1 from public.poll_instruments pi
      where pi.id = instrument_id
        and pi.archived_at is null
        and pi.publish_at <= now()
    )
  );

drop policy if exists "poll_question_options member select" on public.poll_question_options;
create policy "poll_question_options member select"
  on public.poll_question_options for select
  to authenticated
  using (
    exists (
      select 1 from public.poll_questions pq
      join public.poll_instruments pi on pi.id = pq.instrument_id
      where pq.id = question_id
        and pi.archived_at is null
        and pi.publish_at <= now()
    )
  );

-- Members: see own response row only
drop policy if exists "poll_responses member select own" on public.poll_responses;
create policy "poll_responses member select own"
  on public.poll_responses for select
  to authenticated
  using (member_id = auth.uid());

drop policy if exists "poll_response_answers member select own" on public.poll_response_answers;
create policy "poll_response_answers member select own"
  on public.poll_response_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.poll_responses r
      where r.id = response_id and r.member_id = auth.uid()
    )
  );

-- Inserts for responses/answers: use RPC only (no direct insert policies for members)

-- ---------------------------------------------------------------------------
-- submit_poll_response(instrument_id, answers jsonb)
-- answers: [{ "question_id": "uuid", "option_ids": ["uuid"], "text_value": "...", "number_value": 1.5, "write_in_text": "..." }]
-- ---------------------------------------------------------------------------
create or replace function public.submit_poll_response(
  p_instrument_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inst record;
  v_q record;
  v_resp_id uuid;
  elem jsonb;
  v_qid uuid;
  v_opts uuid[];
  v_text text;
  v_num numeric;
  v_write text;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_inst from public.poll_instruments pi
  where pi.id = p_instrument_id
    and pi.archived_at is null
    and pi.publish_at <= now()
    and pi.close_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Poll is not open for responses');
  end if;

  if exists (select 1 from public.poll_responses r where r.instrument_id = p_instrument_id and r.member_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'Already submitted');
  end if;

  select count(*)::int into v_count from public.poll_questions where instrument_id = p_instrument_id;
  if v_count < 1 then
    return jsonb_build_object('ok', false, 'error', 'No questions configured');
  end if;

  -- Validate one JSON object per question
  if jsonb_array_length(p_answers) is distinct from v_count then
    return jsonb_build_object('ok', false, 'error', 'Answer every question');
  end if;

  if (
    select count(distinct (j->>'question_id')::uuid)
    from jsonb_array_elements(p_answers) j
  ) is distinct from v_count then
    return jsonb_build_object('ok', false, 'error', 'Duplicate or missing question in answers');
  end if;

  insert into public.poll_responses (instrument_id, member_id)
  values (p_instrument_id, v_uid)
  returning id into v_resp_id;

  for v_q in
    select * from public.poll_questions where instrument_id = p_instrument_id order by sort_order, id
  loop
    select ans into elem
    from jsonb_array_elements(p_answers) as ans
    where (ans->>'question_id')::uuid = v_q.id
    limit 1;

    if elem is null then
      delete from public.poll_responses where id = v_resp_id;
      return jsonb_build_object('ok', false, 'error', 'Missing answer for a question');
    end if;

    v_qid := (elem->>'question_id')::uuid;
    if v_qid is distinct from v_q.id then
      delete from public.poll_responses where id = v_resp_id;
      return jsonb_build_object('ok', false, 'error', 'Question mismatch');
    end if;

    v_opts := coalesce(
      (select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(elem->'option_ids', '[]'::jsonb)) x),
      '{}'::uuid[]
    );
    v_text := nullif(trim(elem->>'text_value'), '');
    begin
      v_num := (elem->>'number_value')::numeric;
    exception when others then
      v_num := null;
    end;
    if elem->>'number_value' is null or trim(elem->>'number_value') = '' then
      v_num := null;
    end if;
    v_write := nullif(trim(elem->>'write_in_text'), '');

    if v_q.question_type = 'single_choice' then
      if array_length(v_opts, 1) is distinct from 1 then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Select exactly one option per question');
      end if;
      if not exists (
        select 1 from public.poll_question_options o
        where o.question_id = v_q.id and o.id = v_opts[1]
      ) then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Invalid option');
      end if;
      if exists (select 1 from public.poll_question_options o where o.id = v_opts[1] and o.is_write_in_slot) then
        if v_q.allow_write_in is not true or v_write is null then
          delete from public.poll_responses where id = v_resp_id;
          return jsonb_build_object('ok', false, 'error', 'Write-in text required');
        end if;
      end if;
      insert into public.poll_response_answers (response_id, question_id, selected_option_ids, write_in_text)
      values (v_resp_id, v_q.id, v_opts, case when v_write is not null then v_write end);

    elsif v_q.question_type = 'multiple_choice' then
      if v_opts is null or coalesce(array_length(v_opts, 1), 0) < 1 then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Select at least one option');
      end if;
      if exists (
        select 1 from unnest(v_opts) oid
        where not exists (select 1 from public.poll_question_options o where o.question_id = v_q.id and o.id = oid)
      ) then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Invalid option');
      end if;
      -- write-in slot validation
      if exists (
        select 1 from public.poll_question_options o
        where o.question_id = v_q.id and o.is_write_in_slot and o.id = any(v_opts)
      ) and (v_q.allow_write_in is not true or v_write is null) then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Write-in text required');
      end if;
      insert into public.poll_response_answers (response_id, question_id, selected_option_ids, write_in_text)
      values (v_resp_id, v_q.id, v_opts, v_write);

    elsif v_q.question_type in ('text_short', 'text_long') then
      if v_text is null then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Text answer required');
      end if;
      insert into public.poll_response_answers (response_id, question_id, selected_option_ids, text_value)
      values (v_resp_id, v_q.id, '{}', v_text);

    elsif v_q.question_type = 'number' then
      if v_num is null then
        delete from public.poll_responses where id = v_resp_id;
        return jsonb_build_object('ok', false, 'error', 'Number answer required');
      end if;
      insert into public.poll_response_answers (response_id, question_id, selected_option_ids, number_value)
      values (v_resp_id, v_q.id, '{}', v_num);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'response_id', v_resp_id);
exception when others then
  if v_resp_id is not null then
    delete from public.poll_responses where id = v_resp_id;
  end if;
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.submit_poll_response(uuid, jsonb) from public;
grant execute on function public.submit_poll_response(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Member: public results (percentages only for choice questions). Closed + published only.
-- ---------------------------------------------------------------------------
create or replace function public.get_poll_public_results(p_instrument_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_inst record;
  v_total int;
  v_out jsonb := '[]'::jsonb;
  v_q record;
  v_opts jsonb;
  v_opt record;
  v_cnt int;
  v_pct int;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_inst from public.poll_instruments pi
  where pi.id = p_instrument_id
    and pi.archived_at is null
    and pi.publish_at <= now()
    and pi.close_at <= now()
    and pi.results_published_at is not null;

  if not found then
    return jsonb_build_object('error', 'Results not available');
  end if;

  select count(*)::int into v_total
  from public.poll_responses r
  where r.instrument_id = p_instrument_id;

  for v_q in
    select * from public.poll_questions where instrument_id = p_instrument_id order by sort_order, id
  loop
    if v_q.question_type not in ('single_choice', 'multiple_choice') then
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', v_q.id,
        'prompt', v_q.prompt,
        'question_type', v_q.question_type,
        'options', '[]'::jsonb
      ));
      continue;
    end if;

    v_opts := '[]'::jsonb;
    for v_opt in
      select o.id, o.label from public.poll_question_options o
      where o.question_id = v_q.id
      order by o.sort_order, o.id
    loop
      if v_total <= 0 then
        v_pct := 0;
      else
        select count(*)::int into v_cnt
        from public.poll_response_answers a
        join public.poll_responses r on r.id = a.response_id
        where r.instrument_id = p_instrument_id
          and a.question_id = v_q.id
          and v_opt.id = any(a.selected_option_ids);
        v_pct := round(100.0 * v_cnt / v_total)::int;
      end if;
      v_opts := v_opts || jsonb_build_array(jsonb_build_object(
        'option_id', v_opt.id,
        'label', v_opt.label,
        'percent', v_pct
      ));
    end loop;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'question_id', v_q.id,
      'prompt', v_q.prompt,
      'question_type', v_q.question_type,
      'options', v_opts
    ));
  end loop;

  return jsonb_build_object('questions', v_out);
end;
$$;

revoke all on function public.get_poll_public_results(uuid) from public;
grant execute on function public.get_poll_public_results(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: full aggregates (counts + text/number samples)
-- ---------------------------------------------------------------------------
create or replace function public.get_poll_admin_results(p_instrument_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_total int;
  v_out jsonb := '[]'::jsonb;
  v_q record;
  v_opts jsonb;
  v_opt record;
  v_cnt int;
  v_texts jsonb;
  v_numbers jsonb;
begin
  if not public.is_current_user_admin() then
    return jsonb_build_object('error', 'Forbidden');
  end if;

  if not exists (select 1 from public.poll_instruments pi where pi.id = p_instrument_id) then
    return jsonb_build_object('error', 'Not found');
  end if;

  select count(*)::int into v_total from public.poll_responses r where r.instrument_id = p_instrument_id;

  for v_q in
    select * from public.poll_questions where instrument_id = p_instrument_id order by sort_order, id
  loop
    if v_q.question_type in ('single_choice', 'multiple_choice') then
      v_opts := '[]'::jsonb;
      for v_opt in
        select o.id, o.label from public.poll_question_options o
        where o.question_id = v_q.id order by o.sort_order, o.id
      loop
        select count(*)::int into v_cnt
        from public.poll_response_answers a
        join public.poll_responses r on r.id = a.response_id
        where r.instrument_id = p_instrument_id
          and a.question_id = v_q.id
          and v_opt.id = any(a.selected_option_ids);
        v_opts := v_opts || jsonb_build_array(jsonb_build_object(
          'option_id', v_opt.id,
          'label', v_opt.label,
          'count', v_cnt,
          'percent', case when v_total > 0 then round(100.0 * v_cnt / v_total)::int else 0 end
        ));
      end loop;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', v_q.id,
        'prompt', v_q.prompt,
        'question_type', v_q.question_type,
        'total_responses', v_total,
        'options', v_opts
      ));
    elsif v_q.question_type in ('text_short', 'text_long') then
      select coalesce(jsonb_agg(sub.val), '[]'::jsonb) into v_texts
      from (
        select a.text_value as val
        from public.poll_response_answers a
        join public.poll_responses r on r.id = a.response_id
        where r.instrument_id = p_instrument_id and a.question_id = v_q.id and a.text_value is not null
        order by r.submitted_at desc
        limit 500
      ) sub;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', v_q.id,
        'prompt', v_q.prompt,
        'question_type', v_q.question_type,
        'total_responses', v_total,
        'text_answers', coalesce(v_texts, '[]'::jsonb)
      ));
    else
      select coalesce(jsonb_agg(sub.val), '[]'::jsonb) into v_numbers
      from (
        select a.number_value::float8 as val
        from public.poll_response_answers a
        join public.poll_responses r on r.id = a.response_id
        where r.instrument_id = p_instrument_id and a.question_id = v_q.id and a.number_value is not null
        order by r.submitted_at desc
        limit 500
      ) sub;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', v_q.id,
        'prompt', v_q.prompt,
        'question_type', v_q.question_type,
        'total_responses', v_total,
        'number_answers', coalesce(v_numbers, '[]'::jsonb)
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'instrument_id', p_instrument_id,
    'total_responses', v_total,
    'questions', v_out
  );
end;
$$;

revoke all on function public.get_poll_admin_results(uuid) from public;
grant execute on function public.get_poll_admin_results(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: publish results (after review)
-- ---------------------------------------------------------------------------
create or replace function public.approve_poll_results(p_instrument_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    return jsonb_build_object('ok', false, 'error', 'Forbidden');
  end if;

  update public.poll_instruments
  set results_published_at = now(), updated_at = now()
  where id = p_instrument_id
    and archived_at is null
    and close_at <= now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Instrument not found or not closed');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.approve_poll_results(uuid) from public;
grant execute on function public.approve_poll_results(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: archive (hide from member lists)
-- ---------------------------------------------------------------------------
create or replace function public.archive_poll_instrument(p_instrument_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    return jsonb_build_object('ok', false, 'error', 'Forbidden');
  end if;

  update public.poll_instruments
  set archived_at = now(), updated_at = now()
  where id = p_instrument_id and archived_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Already archived or not found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.archive_poll_instrument(uuid) from public;
grant execute on function public.archive_poll_instrument(uuid) to authenticated;
