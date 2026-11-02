-- ---------------------------------------------------------------------------
-- One person, one account: Gmail ignores dots and "+tags" (a.b+x@gmail.com is ab@gmail.com), so a few clicks used to
-- make hundreds of "different" addresses (security review 2026-11-02). Run this whole file once in Supabase → SQL Editor.
--
-- It replaces hook_before_user_created (the one from 0006, so the "Before User Created" hook you already added keeps
-- working: no need to add it again) and adds one more refusal: a sign-up whose address is the same mailbox as an
-- existing account's is turned away with "alias_email". The same rules in TypeScript: src/data/emailAlias.ts.
--
-- Rules (public.normalize_email): lower case; gmail.com = googlemail.com with dots and everything after "+" ignored;
-- on outlook / hotmail / live / msn / icloud / me.com / proton / fastmail only the "+tag" is ignored (dots count there).
-- The last query lists accounts that already share a mailbox (look at them, delete the extras in Authentication → Users).

create or replace function public.normalize_email(addr text)
returns text
language sql immutable parallel safe set search_path = '' as $$
  with parts as (
    select lower(btrim(coalesce(addr, ''))) as e
  ), split as (
    select split_part(e, '@', 1) as local,
           case split_part(e, '@', 2) when 'googlemail.com' then 'gmail.com' else split_part(e, '@', 2) end as host
    from parts
  )
  select case
    when host = '' or local = '' then (select e from parts)
    when host = 'gmail.com' then replace(split_part(local, '+', 1), '.', '') || '@' || host
    when host in ('outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'pm.me', 'fastmail.com')
      then split_part(local, '+', 1) || '@' || host
    else local || '@' || host
  end
  from split
$$;

-- The check reads the profiles table, indexed on the normalized address so it stays quick with many accounts.
create index if not exists profiles_normalized_email on public.profiles (public.normalize_email(email));
drop policy if exists "auth reads profile emails" on public.profiles;
create policy "auth reads profile emails" on public.profiles for select to supabase_auth_admin using (true);
grant select on public.profiles to supabase_auth_admin;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  addr text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  host text := split_part(addr, '@', 2);
  parts text[] := string_to_array(host, '.');
begin
  if host = '' or parts is null then return '{}'::jsonb; end if;
  -- Throwaway domains: the domain itself or any parent of it (mail.throwaway.com is throwaway.com's).
  for i in 1 .. greatest(array_length(parts, 1) - 1, 1) loop
    if exists (select 1 from public.blocked_email_domains b where b.domain = array_to_string(parts[i:], '.')) then
      return jsonb_build_object('error', jsonb_build_object('http_code', 400,
        'message', 'disposable_email: Tek kullanımlık e-posta adresleriyle hesap açılamıyor.'));
    end if;
  end loop;
  -- The same mailbox under another spelling (dots, +tag) as someone who already has an account.
  if exists (
    select 1 from public.profiles p
    where public.normalize_email(p.email) = public.normalize_email(addr) and lower(btrim(p.email)) <> addr
  ) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400,
      'message', 'alias_email: Bu adresin başka bir yazılışıyla zaten bir hesap var.'));
  end if;
  return '{}'::jsonb;
end;
$$;

grant execute on function public.normalize_email(text) to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- Accounts that already share a mailbox (the oldest is the one to keep).
select public.normalize_email(email) as mailbox, count(*) as accounts, array_agg(email order by created_at) as addresses
from public.profiles
group by 1
having count(*) > 1
order by accounts desc;
