-- Daily counters in one table, exact: the allowances per account (translation characters, AI calls and money, speech,
-- the endpoints that fetch other sites, reports) and the site-wide usage and notice counts. Until this runs the server
-- keeps counting in R2 files as before (approximate: two instances can miss each other's counts); once it has run,
-- api/_quota.ts uses these functions and every count is one atomic statement.
--
-- Server only: row security is on with no policy, and the functions can be called with the service role alone (the
-- publishable key the app ships with cannot read or move a counter).

create table if not exists public.usage_counters (
  name text not null,
  day date not null,
  subject text not null,
  used bigint not null default 0,
  primary key (name, day, subject)
);
alter table public.usage_counters enable row level security;

-- What a subject has used of a counter on a day (0 when nothing yet).
create or replace function public.counter_used(p_name text, p_subject text, p_day date)
returns bigint language sql stable set search_path = public as $$
  select coalesce((select used from public.usage_counters where name = p_name and day = p_day and subject = p_subject), 0)
$$;

-- Adds to a counter (after the call it paid for went through) and gives the new total.
create or replace function public.counter_add(p_name text, p_subject text, p_amount bigint, p_day date)
returns bigint language sql volatile set search_path = public as $$
  insert into public.usage_counters as c (name, day, subject, used) values (p_name, p_day, p_subject, greatest(p_amount, 0))
  on conflict (name, day, subject) do update set used = c.used + greatest(excluded.used, 0)
  returning used
$$;

-- Takes p_amount if it still fits under p_max, in one statement (two requests at once cannot both slip through):
-- true when taken, false when it would go over (then nothing is counted).
create or replace function public.counter_take(p_name text, p_subject text, p_amount bigint, p_max bigint, p_day date)
returns boolean language plpgsql volatile set search_path = public as $$
declare
  total bigint;
begin
  if p_amount > p_max then
    return false;
  end if;
  insert into public.usage_counters as c (name, day, subject, used) values (p_name, p_day, p_subject, p_amount)
  on conflict (name, day, subject) do update set used = c.used + excluded.used
    where c.used + excluded.used <= p_max
  returning used into total;
  return total is not null;
end
$$;

-- Old days go (the hourly job calls it; usage reports read at most a few weeks back).
create or replace function public.counter_prune(p_keep_days integer default 120)
returns integer language sql volatile set search_path = public as $$
  with gone as (delete from public.usage_counters where day < (now() at time zone 'utc')::date - p_keep_days returning 1)
  select count(*)::integer from gone
$$;

revoke all on function public.counter_used(text, text, date) from public, anon, authenticated;
revoke all on function public.counter_add(text, text, bigint, date) from public, anon, authenticated;
revoke all on function public.counter_take(text, text, bigint, bigint, date) from public, anon, authenticated;
revoke all on function public.counter_prune(integer) from public, anon, authenticated;
grant execute on function public.counter_used(text, text, date) to service_role;
grant execute on function public.counter_add(text, text, bigint, date) to service_role;
grant execute on function public.counter_take(text, text, bigint, bigint, date) to service_role;
grant execute on function public.counter_prune(integer) to service_role;
