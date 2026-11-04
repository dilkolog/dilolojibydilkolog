-- The owner's own block list (admin screen → Engellenenler): an address or a whole domain that may not open an account
-- again. Run this whole file once in Supabase → SQL Editor, after 0008_email_aliases.sql.
--
-- It replaces hook_before_user_created once more (the "Before User Created" hook you already added keeps working) with
-- the same checks as 0008 plus one: an address on this list (compared as the same mailbox, so a.b+x@gmail.com is
-- ab@gmail.com) or a domain on it (or any parent of it) is turned away with "blocked_email". The throwaway domains of
-- 0006 stay in their own table; this one holds only what the owner added. Server only: row security on, no policy
-- for the app's keys.

create table if not exists public.owner_blocks (
  kind text not null check (kind in ('email', 'domain')),
  value text not null check (value = lower(value) and length(value) between 3 and 254),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (kind, value)
);
alter table public.owner_blocks enable row level security;
drop policy if exists "auth reads owner blocks" on public.owner_blocks;
create policy "auth reads owner blocks" on public.owner_blocks for select to supabase_auth_admin using (true);
grant select on public.owner_blocks to supabase_auth_admin;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  addr text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  host text := split_part(addr, '@', 2);
  parts text[] := string_to_array(host, '.');
begin
  if host = '' or parts is null then return '{}'::jsonb; end if;
  -- The owner's block list: the mailbox itself, or its domain or any parent of it.
  if exists (select 1 from public.owner_blocks b where b.kind = 'email' and public.normalize_email(b.value) = public.normalize_email(addr)) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400,
      'message', 'blocked_email: Bu adresle hesap açılamıyor.'));
  end if;
  for i in 1 .. greatest(array_length(parts, 1) - 1, 1) loop
    if exists (select 1 from public.owner_blocks b where b.kind = 'domain' and b.value = array_to_string(parts[i:], '.')) then
      return jsonb_build_object('error', jsonb_build_object('http_code', 400,
        'message', 'blocked_email: Bu adresle hesap açılamıyor.'));
    end if;
  end loop;
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

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
