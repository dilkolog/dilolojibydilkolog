-- Diloloji phase 2: the synced data lives in Supabase (plain JSON, each person sees only their own).
-- Run once in Supabase → SQL Editor, after 0001_accounts.sql.
--
-- The app's sync keeps its own merge rules and sends its data in parts, as before:
--   core            everything but the answers and the reading texts (words, states, lists, settings…)
--   ev-YYYY-MM      the answers of a month
--   tx-<40 hex>     one reading text
--   h-YYYY-MM-DD    the day's restore point (a copy of the first core written that day; a week kept)
-- Pictures and recordings go to the Storage bucket "media", one file per item under the person's folder.
-- The views at the end make the data readable in the dashboard (Table Editor → Views / SQL Editor).

create table if not exists public.sync_parts (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name ~ '^(core|ev-[0-9]{4}-[0-9]{2}|tx-[0-9a-f]{40}|h-[0-9]{4}-[0-9]{2}-[0-9]{2})$'),
  data jsonb not null,
  version bigint not null default 1,
  bytes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.sync_parts enable row level security;

-- A person reads their own parts; writing goes through put_sync_part (it checks the approval and the version).
drop policy if exists "own parts" on public.sync_parts;
create policy "own parts" on public.sync_parts for select using (auth.uid() = user_id);

-- Writes a part. p_expect: the version read (null: whatever is there); p_create: only if nobody wrote it yet.
-- Raises 'conflict' (40001) when another device wrote in between, 'approval required' (42501) before approval.
create or replace function public.put_sync_part(p_name text, p_data jsonb, p_expect bigint default null, p_create boolean default false)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v bigint;
  size integer := octet_length(p_data::text);
  today text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  if uid is null then raise exception 'signed out' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where user_id = uid and approved) then
    raise exception 'approval required' using errcode = '42501';
  end if;
  if p_name !~ '^(core|ev-[0-9]{4}-[0-9]{2}|tx-[0-9a-f]{40})$' then raise exception 'bad part' using errcode = '22023'; end if;
  if size > 8000000 then raise exception 'too large' using errcode = '54000'; end if;

  if p_create then
    insert into public.sync_parts (user_id, name, data, bytes) values (uid, p_name, p_data, size)
      on conflict (user_id, name) do nothing returning version into v;
  elsif p_expect is null then
    insert into public.sync_parts (user_id, name, data, bytes) values (uid, p_name, p_data, size)
      on conflict (user_id, name) do update set data = excluded.data, bytes = excluded.bytes, version = public.sync_parts.version + 1, updated_at = now()
      returning version into v;
  else
    update public.sync_parts set data = p_data, bytes = size, version = version + 1, updated_at = now()
      where user_id = uid and name = p_name and version = p_expect returning version into v;
  end if;
  if v is null then raise exception 'conflict' using errcode = '40001'; end if;

  if p_name = 'core' then
    insert into public.sync_parts (user_id, name, data, bytes) values (uid, 'h-' || today, p_data, size)
      on conflict (user_id, name) do nothing;
    delete from public.sync_parts where user_id = uid and name like 'h-%'
      and name < 'h-' || to_char((now() - interval '7 days') at time zone 'utc', 'YYYY-MM-DD');
  end if;
  return v;
end;
$$;

revoke all on function public.put_sync_part(text, jsonb, bigint, boolean) from public, anon;
grant execute on function public.put_sync_part(text, jsonb, bigint, boolean) to authenticated;

-- Pictures and recordings: a private bucket, each person in their own folder (<user id>/m-….json).
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;

drop policy if exists "own media read" on storage.objects;
create policy "own media read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own media write" on storage.objects;
create policy "own media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where user_id = auth.uid() and approved));
drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Views for the dashboard: who learns what. They read the same rows; nothing to keep in step.
-- security_invoker: a signed-in person querying them sees only their own; the dashboard sees all.
-- ---------------------------------------------------------------------------

create or replace view public.people with (security_invoker = on) as
select pr.user_id, pr.email, pr.username, pr.approved, pr.rejected, pr.created_at,
  jsonb_array_length(coalesce(c.data -> 'vocabulary', '[]')) as words,
  (select coalesce(sum(jsonb_array_length(e.data -> 'events')), 0) from public.sync_parts e where e.user_id = pr.user_id and e.name like 'ev-%') as answers,
  (select count(*) from public.sync_parts t where t.user_id = pr.user_id and t.name like 'tx-%') as texts,
  c.updated_at as last_sync
from public.profiles pr
left join public.sync_parts c on c.user_id = pr.user_id and c.name = 'core';

create or replace view public.words with (security_invoker = on) as
select c.user_id, w ->> 'id' as id, w ->> 'language' as language, w ->> 'lemma' as word,
  w -> 'senses' -> 0 ->> 'gloss' as meaning, w ->> 'partOfSpeech' as part_of_speech,
  w ->> 'listId' as list_id, (w ->> 'addedAt') as added_at, (w ->> 'editedAt') as edited_at
from public.sync_parts c, jsonb_array_elements(coalesce(c.data -> 'vocabulary', '[]')) w
where c.name = 'core';

create or replace view public.answers with (security_invoker = on) as
select p.user_id, e ->> 'id' as id, e ->> 'entryId' as word_id, e ->> 'language' as language,
  e ->> 'exerciseType' as exercise_type, e ->> 'verdict' as verdict, (e ->> 'timestamp') as answered_at
from public.sync_parts p, jsonb_array_elements(coalesce(p.data -> 'events', '[]')) e
where p.name like 'ev-%';

create or replace view public.word_lists with (security_invoker = on) as
select c.user_id, l ->> 'id' as id, l ->> 'language' as language, l ->> 'name' as name,
  (l ->> 'createdAt') as created_at, (l ->> 'updatedAt') as updated_at
from public.sync_parts c, jsonb_array_elements(coalesce(c.data -> 'lists', '[]')) l
where c.name = 'core';
