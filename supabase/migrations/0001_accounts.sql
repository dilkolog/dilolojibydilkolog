-- Diloloji accounts on Supabase (phase 1: sign-in). Run once in Supabase → SQL Editor.
-- profiles: one row per person, made on sign-up; `approved` is the owner's switch.
-- sync_keys: the person's sync account; only the server (service role) reads or writes it.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text,
  note text,
  email text,
  approved boolean not null default false,
  rejected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_keys (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  sync_id text not null unique check (sync_id ~ '^[0-9a-f]{64}$'),
  enc text not null check (enc ~ '^[0-9a-f]{64}$'),
  auth text not null check (auth ~ '^[0-9a-f]{64}$'),
  username text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.sync_keys enable row level security;

-- A person sees their own profile (the app shows "waiting for approval"); nobody changes `approved` but the owner.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = user_id);
-- sync_keys has no policy at all: only the service role (the app's server) reaches it.

-- The profile is made when someone signs up (email, magic link or Google).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, username, note, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    left(new.raw_user_meta_data ->> 'note', 200),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- People who signed up before this ran get their profile too.
insert into public.profiles (user_id, username, email)
select id, split_part(email, '@', 1), email from auth.users
on conflict (user_id) do nothing;
