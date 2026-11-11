-- ---------------------------------------------------------------------------
-- Security review 2026-11-10. Run once in Supabase → SQL Editor (after 0012). Safe to run again.
--
-- 1. counter_give: the server sets an AI call's money (and a translation's or speech's characters) aside before the
--    call with counter_take, then gives back what it did not use. Until this runs the server simply cannot give
--    back (an account has a little less left that day, never more).
-- 2. Media: the update policy (an upload with upsert over an existing file) now checks the same 200 MB per person
--    as the insert policy; before, small files could be uploaded and each one rewritten at 6 MB. A person may also
--    delete their own files (nothing could, before).
-- 3. Sign-up: the name a person chooses is cut to 40 characters, like the note to 200.
-- ---------------------------------------------------------------------------

-- 1. Gives back part of a counter (never below zero) and returns the new total.
create or replace function public.counter_give(p_name text, p_subject text, p_amount bigint, p_day date)
returns bigint language sql volatile set search_path = public as $$
  update public.usage_counters set used = greatest(used - greatest(p_amount, 0), 0)
    where name = p_name and day = p_day and subject = p_subject
  returning used
$$;
revoke all on function public.counter_give(text, text, bigint, date) from public, anon, authenticated;
grant execute on function public.counter_give(text, text, bigint, date) to service_role;

-- 2. Media: rewriting a file counts against the same limit as adding one; deleting one's own files is allowed.
drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where user_id = auth.uid() and approved)
    and (select u.bytes < 200000000 from public.my_media_usage() u));
drop policy if exists "own media delete" on storage.objects;
create policy "own media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. The sign-up trigger (0001), with the chosen name cut to 40 characters. Its privileges (0012) stay as they were:
--    CREATE OR REPLACE keeps the function's grants.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, username, note, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 40),
    left(new.raw_user_meta_data ->> 'note', 200),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
