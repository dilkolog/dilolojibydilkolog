-- The server's small documents that lived as R2 files with no table of their own: chosen @names and who holds them,
-- friend requests and blocks, reports (and the votes that take a library list down), the weekly error digest, the old
-- approval marks and the account keys of the first sign-ups (api/_docs.ts). One row per former file: its path and
-- its text, so the code that used them did not change.
--
-- Once this has run, new writes go here at once and reads look here first, then at the old file (nothing goes missing
-- before the move). The owner's "Taşı" on the admin screen copies the old files over in small steps and then sets the
-- 'docs' flag, after which the R2 files are no longer read. Server only: row security on, no policy.

create table if not exists public.server_docs (
  path text primary key,
  body text not null,
  updated_at timestamptz not null default now()
);
alter table public.server_docs enable row level security;

-- Listing by prefix (a day's reports, a kind of approval mark) reads the index in path order.
create index if not exists server_docs_path_prefix on public.server_docs (path text_pattern_ops);
