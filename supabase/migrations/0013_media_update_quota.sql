-- ---------------------------------------------------------------------------
-- The media bucket's limits (0005: 3000 files and 200 MB a person) were checked only when a file was added. Replacing
-- a file went unchecked, so a person could add small files and then grow each one to the 6 MB file limit: far past
-- the 200 MB, on a plan whose whole storage is 1 GB. The update rule now checks the same total (a person already at
-- the line can still not grow anything; the file count may sit at its limit, since an update adds no file).
-- 0005 carries the same rule for a project set up from scratch. Run once in Supabase → SQL Editor
-- (src/data/supabaseMigrations.test.ts checks it).
-- ---------------------------------------------------------------------------

drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles where user_id = auth.uid() and approved)
    and (select u.files <= 3000 and u.bytes < 200000000 from public.my_media_usage() u));
