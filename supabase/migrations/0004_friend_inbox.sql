-- Diloloji: the friends' inbox (a cheer, a nudge, a gift word, a text, a request) moves from Blob files to a table.
-- Run once in Supabase → SQL Editor, after 0003_server_tables.sql. Running it is the switch: the last statement
-- writes the 'inbox' flag, and from then on the server reads and writes the inbox here. Until it is run (or if
-- this table is ever missing) the server keeps using the Blob files, and what was waiting in a Blob inbox is
-- carried over the next time that person's inbox is read or changed.
--
-- Only the server (the secret key) reads and writes it: row level security is on and there is no policy.

create table if not exists public.friend_inbox (
  id text primary key,
  -- The recipient's sync account.
  sync_id text not null check (sync_id ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('cheer', 'nudge', 'gift', 'text', 'joined', 'request')),
  from_code text not null check (from_code ~ '^[2-9A-HJKMNP-Z]{8}$'),
  from_name text not null default '',
  gift jsonb,
  sent_text jsonb,
  at timestamptz not null default now()
);
alter table public.friend_inbox enable row level security;
create index if not exists friend_inbox_recipient on public.friend_inbox (sync_id, at desc);

insert into public.server_flags (name, value) values ('inbox', 'true'::jsonb) on conflict (name) do nothing;
