-- The owner decides what the AI may do for each approved person: profiles.ai_level.
--   null / 'calisma'  the default: words, sentences, stories, journal, reports (no free chat)
--   'kapali'          no AI at all
--   'kelime'          only word and reading helpers (fill, suggest, mnemonics, questions)
--   'tam'             everything, including the Monki chat, photo words and the mini podcast
-- Set it in the Table Editor (profiles → ai_level). The server reads it with the service key, nobody can change it from the app.
alter table public.profiles add column if not exists ai_level text
  check (ai_level in ('kapali', 'kelime', 'calisma', 'tam'));
