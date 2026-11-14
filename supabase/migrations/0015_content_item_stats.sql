-- ---------------------------------------------------------------------------
-- How the content's items are answered, across everyone (2026-11-14). Run once in Supabase → SQL Editor (after 0014).
-- Safe to run again.
--
-- content_item_stats(since): one row per item answered since `since` (default: the last 7 days), with how many people
-- answered it and how often right and wrong, for the weekly "most missed" report (npm run content -- missed). An item
-- many get wrong is most likely broken; one everyone gets right may be pointless. Rows name the item, never a person:
-- `people` is only a count. Only the server's key (service role) may call it.
--
--   word      a word's answers in the sync's month parts (the `answers` view's events); "near" (a typo) counts as
--             neither right nor wrong. The id is the word's (a pack word: "fr:maison").
--   grammar … one of the practice logs kept in the core part (grammar, examTasks, traps, register, flow, affixes,
--             reflex, pairs, enVerbs): `ok` and `wrong` are the person's totals for the item, `last` its last answer.
--             The id is the question's ("fr-g-000123", "fr-reading-…|2" for an exam set's second question).
-- A date that is not ISO (an old test's plain object) is left out rather than failing the report.
-- ---------------------------------------------------------------------------

create or replace function public.content_item_stats(p_since timestamptz default now() - interval '7 days')
returns table (kind text, item text, people bigint, ok bigint, wrong bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  -- plpgsql: the body is checked when called, so this file runs even where 0002 (sync_parts) has not been run yet.
  return query
  with logs as (
    select k.kind, e.key as item, c.user_id,
      case when (e.value ->> 'ok') ~ '^\d+$' then (e.value ->> 'ok')::bigint else 0 end as ok,
      case when (e.value ->> 'wrong') ~ '^\d+$' then (e.value ->> 'wrong')::bigint else 0 end as wrong,
      case when (e.value ->> 'last') ~ '^\d{4}-\d{2}-\d{2}T' then (e.value ->> 'last')::timestamptz end as last_at
    from public.sync_parts c
    cross join (values ('grammar'), ('examTasks'), ('traps'), ('register'), ('flow'), ('affixes'), ('reflex'), ('pairs'), ('enVerbs')) as k(kind)
    cross join lateral jsonb_each(case when jsonb_typeof(c.data -> k.kind) = 'object' then c.data -> k.kind else '{}'::jsonb end) e
    where c.name = 'core' and jsonb_typeof(e.value) = 'object'
  ),
  words as (
    select e ->> 'entryId' as item, p.user_id, e ->> 'verdict' as verdict, (e ->> 'timestamp')::timestamptz as at
    from public.sync_parts p, jsonb_array_elements(coalesce(p.data -> 'events', '[]')) e
    where p.name like 'ev-%' and (e ->> 'timestamp') ~ '^\d{4}-\d{2}-\d{2}T' and e ? 'entryId'
  )
  select logs.kind, logs.item, count(distinct logs.user_id), sum(logs.ok)::bigint, sum(logs.wrong)::bigint, max(logs.last_at)
    from logs where logs.last_at >= p_since group by logs.kind, logs.item
  union all
  select 'word'::text, words.item, count(distinct words.user_id), count(*) filter (where words.verdict = 'correct'), count(*) filter (where words.verdict = 'wrong'), max(words.at)
    from words where words.at >= p_since group by words.item;
end;
$$;
revoke all on function public.content_item_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.content_item_stats(timestamptz) to service_role;
