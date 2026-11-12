-- ---------------------------------------------------------------------------
-- How full the project is (2026-11-12). Run once in Supabase → SQL Editor (after 0013, and after 0005 has been run
-- again with its new limits). Safe to run again.
--
-- storage_usage(): the database's size and what the media bucket holds, for the hourly health check (api/_health.ts),
-- which mails the owner when either passes 80% of the free plan (500 MB database, 1 GB Storage). Only the server
-- (service role) may call it: it says nothing about any one person.
-- ---------------------------------------------------------------------------

create or replace function public.storage_usage(out db_bytes bigint, out media_bytes bigint, out media_files bigint)
language sql stable security definer set search_path = '' as $$
  select pg_database_size(current_database()),
    coalesce((select sum((metadata ->> 'size')::bigint) from storage.objects where bucket_id = 'media'), 0),
    (select count(*) from storage.objects where bucket_id = 'media');
$$;
revoke all on function public.storage_usage() from public, anon, authenticated;
grant execute on function public.storage_usage() to service_role;
