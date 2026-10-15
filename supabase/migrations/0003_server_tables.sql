-- Diloloji phase 2b: friends, shared lists and reminders move from Vercel Blob (JSON files) to tables.
-- Run once in Supabase → SQL Editor, after 0002_sync_data.sql. Then, in the app: Settings → Account →
-- Yönetici → "Sunucu verilerini Supabase'e taşı". Until that button is pressed the server keeps using Blob.
--
-- Only the server (the secret key) reads and writes these tables: row level security is on and there
-- is no policy, so the app's publishable key sees nothing. The views at the end are for the dashboard.

-- The server's switches. 'tables' (written by the move): friends, shares and reminders are read from here.
create table if not exists public.server_flags (
  name text primary key,
  value jsonb not null default 'true'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.server_flags enable row level security;

-- Friends: an account's card under its friend code, and whom it follows.
create table if not exists public.friend_cards (
  sync_id text primary key check (sync_id ~ '^[0-9a-f]{64}$'),
  code text not null unique check (code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  name text not null default 'Arkadaş',
  avatar text not null default '',
  color text not null default '#6366f1',
  days jsonb not null default '{}'::jsonb,
  streak integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.friend_cards enable row level security;

create table if not exists public.friend_follows (
  sync_id text not null check (sync_id ~ '^[0-9a-f]{64}$'),
  code text not null check (code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  created_at timestamptz not null default now(),
  primary key (sync_id, code)
);
alter table public.friend_follows enable row level security;

-- Word lists shared by link: snapshots ('set', some published to the community library) and lists
-- edited together ('collab', `version` goes up with every write).
create table if not exists public.shared_lists (
  id text primary key check (id ~ '^[0-9a-f]{32}$'),
  kind text not null check (kind in ('set', 'collab')),
  owner text not null default '',
  name text not null,
  language text not null check (language in ('en', 'fr', 'es')),
  words jsonb not null default '[]'::jsonb,
  word_count integer not null default 0,
  version bigint not null default 1,
  published boolean not null default false,
  published_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shared_lists enable row level security;
create index if not exists shared_lists_library on public.shared_lists (published, created_at desc);
create index if not exists shared_lists_owner on public.shared_lists (owner);

-- Reminders: a browser's push subscription ('push', key = 40 hex of its address) or a mail address
-- ('mail', key = 'mail-' + 40 hex of the address). `record` is what the device reported.
create table if not exists public.reminders (
  key text primary key check (key ~ '^(mail-)?[0-9a-f]{40}$'),
  kind text not null check (kind in ('push', 'mail')),
  owner text,
  email text,
  confirmed boolean not null default false,
  record jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
create index if not exists reminders_owner on public.reminders (owner);

-- For the dashboard.
create or replace view public.friend_overview with (security_invoker = true) as
  select c.code, c.name, c.streak, c.level, c.updated_at, k.username, p.email,
    (select count(*) from public.friend_follows f where f.sync_id = c.sync_id) as following,
    (select count(*) from public.friend_follows f where f.code = c.code) as followers
  from public.friend_cards c
  left join public.sync_keys k on k.sync_id = c.sync_id
  left join public.profiles p on p.user_id = k.user_id;

create or replace view public.shared_overview with (security_invoker = true) as
  select s.id, s.kind, s.name, s.language, s.word_count, s.published, s.published_by, s.created_at, s.updated_at, k.username as owner_name
  from public.shared_lists s
  left join public.sync_keys k on k.sync_id = s.owner;

create or replace view public.reminder_overview with (security_invoker = true) as
  select r.key, r.kind, r.email, r.confirmed, r.record ->> 'hour' as hour, r.record ->> 'studiedDay' as studied_day,
    (r.record ->> 'streak')::int as streak, r.updated_at, k.username as owner_name
  from public.reminders r
  left join public.sync_keys k on k.sync_id = r.owner;
