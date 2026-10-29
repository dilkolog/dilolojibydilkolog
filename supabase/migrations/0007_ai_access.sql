-- The owner's second switch: whether a person may use the paid helpers (AI, pronunciation scoring, natural
-- voice) that run on the owner's keys through /api/ai. Separate from `approved` (the app itself), off by default.
-- Only the owner sets it (Table Editor → profiles → ai_enabled); people read their own profile but cannot update it
-- (profiles has a select policy only).
alter table public.profiles add column if not exists ai_enabled boolean not null default false;

-- To turn it on for someone, by e-mail:
--   update public.profiles set ai_enabled = true
--   where user_id = (select id from auth.users where email = 'kisi@example.com');
