-- ---------------------------------------------------------------------------
-- handle_new_user (0001) is the sign-up trigger that makes a person's profile. As a SECURITY DEFINER function in
-- the public schema it was callable through the REST API (/rest/v1/rpc/handle_new_user) by anyone: Postgres refuses
-- to run a trigger function that way, so nothing could happen, but Supabase's security advisor rightly flags it.
-- EXECUTE is taken from everyone (PUBLIC as well, which anon and authenticated inherit) and given back only to the
-- role that creates users; the trigger keeps working. Run once in Supabase → SQL Editor (src/data/supabaseMigrations.test.ts
-- checks it).
-- ---------------------------------------------------------------------------

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin, service_role;
