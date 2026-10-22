-- ---------------------------------------------------------------------------
-- Limits per person on what sync may store (security review 2026-10-22). Run once in Supabase → SQL Editor
-- (after 0002). Sign-up is open and a new account counts as approved, so without these one account could fill
-- the project's database (500 MB on the free plan) or Storage and stop sync for everyone.
--
-- sync_parts: at most 100 MB of data per person (restore points "h-…" not counted: they are copies of the core,
--   at most a week of them) and at most 5000 reading texts ("tx-…"). Over the limit the write fails with 54000,
--   which the app shows as "too large" (SyncTooLargeError).
-- media (pictures, recordings): at most 6 MB per file (the app sends at most 3 MB, as JSON), JSON only,
--   at most 3000 files and 200 MB per person. A refused upload is skipped by the app like a too large one.
-- Change the numbers here and run again to move a limit.

create or replace function public.put_sync_part(p_name text, p_data jsonb, p_expect bigint default null, p_create boolean default false)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v bigint;
  size integer := octet_length(p_data::text);
  today text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  others bigint;
  texts bigint;
begin
  if uid is null then raise exception 'signed out' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where user_id = uid and approved) then
    raise exception 'approval required' using errcode = '42501';
  end if;
  if p_name !~ '^(core|ev-[0-9]{4}-[0-9]{2}|tx-[0-9a-f]{40})$' then raise exception 'bad part' using errcode = '22023'; end if;
  if size > 8000000 then raise exception 'too large' using errcode = '54000'; end if;

  -- The person's other parts, and this one at its new size: within the limit.
  select coalesce(sum(bytes), 0), count(*) filter (where name like 'tx-%')
    into others, texts
    from public.sync_parts where user_id = uid and name <> p_name and name not like 'h-%';
  if others + size > 100000000 then raise exception 'quota' using errcode = '54000'; end if;
  if p_name like 'tx-%' and texts >= 5000 then raise exception 'quota' using errcode = '54000'; end if;

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

-- Media: a file size and type limit on the bucket itself.
update storage.buckets set file_size_limit = 6000000, allowed_mime_types = array['application/json'] where id = 'media';

-- What the signed-in person keeps in the media bucket (only their own folder; no argument, so nobody asks about another).
create or replace function public.my_media_usage(out files bigint, out bytes bigint)
language sql stable security definer set search_path = '' as $$
  select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0)
    from storage.objects
    where bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text;
$$;
revoke all on function public.my_media_usage() from public, anon;
grant execute on function public.my_media_usage() to authenticated;

drop policy if exists "own media write" on storage.objects;
create policy "own media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where user_id = auth.uid() and approved)
    and (select u.files < 3000 and u.bytes < 200000000 from public.my_media_usage() u));
drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where user_id = auth.uid() and approved));
