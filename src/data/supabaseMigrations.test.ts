// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The Supabase migrations (supabase/migrations/*.sql), run in a local Postgres with a small stand-in for Supabase's
 * own schemas (auth, storage, the roles). The owner runs them by hand in the SQL Editor, so the order matters:
 * on the live project 0002 (the sync tables) was never run while 0005 (the limits on them) was, and 0002 run alone
 * now would put the unlimited versions back. docs/SUPABASE.md says to run 0005 again after 0002; this keeps that true.
 */
const DIR = join(__dirname, '../../supabase/migrations')
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()

const STUB = `
create role anon; create role authenticated; create role service_role; create role supabase_auth_admin;
create schema auth; create schema storage; create schema extensions;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid, metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema auth to supabase_auth_admin; grant insert, select on auth.users to supabase_auth_admin;
`

async function run(order: string[]) {
  const db = new PGlite()
  await db.exec(STUB)
  for (const f of order) await db.exec(readFileSync(join(DIR, f), 'utf8'))
  const one = async <T>(sql: string) => ((await db.query<T>(sql)).rows[0] ?? null) as T | null
  return {
    db,
    tables: (await db.query<{ t: string }>(`select table_name as t from information_schema.tables where table_schema = 'public'`)).rows.map((r) => r.t),
    limits: /5000/.test((await one<{ src: string }>(`select prosrc as src from pg_proc where proname = 'put_sync_part'`))?.src ?? ''),
    bucket: await one<{ file_size_limit: number | null; allowed_mime_types: string[] | null }>(`select file_size_limit, allowed_mime_types from storage.buckets where id = 'media'`),
    mediaQuota: /my_media_usage/.test((await one<{ rule: string }>(`select with_check as rule from pg_policies where tablename = 'objects' and policyname = 'own media write'`))?.rule ?? ''),
  }
}

const without = (name: string) => FILES.filter((f) => !f.startsWith(name))

describe('Supabase migrations', () => {
  it('run in order on a new project, with the sync tables and their limits', async () => {
    const s = await run(FILES)
    expect(s.tables).toEqual(expect.arrayContaining(['profiles', 'sync_keys', 'sync_parts', 'server_flags', 'friend_cards', 'shared_lists', 'reminders', 'friend_inbox', 'usage_counters', 'server_docs', 'owner_blocks']))
    expect([s.limits, s.bucket, s.mediaQuota]).toEqual([true, { file_size_limit: 6000000, allowed_mime_types: ['application/json'] }, true])
  }, 60_000)

  it('on the live project (everything but 0002 run), 0002 then 0005 again gives the same result', async () => {
    const s = await run([...without('0002'), '0002_sync_data.sql', '0005_storage_limits.sql'])
    expect([s.tables.includes('sync_parts'), s.limits, s.bucket?.file_size_limit, s.mediaQuota]).toEqual([true, true, 6000000, true])
  }, 60_000)

  it('0002 alone there would drop the limits (why 0005 is run again)', async () => {
    const s = await run([...without('0002'), '0002_sync_data.sql'])
    expect([s.limits, s.bucket?.file_size_limit ?? null, s.mediaQuota]).toEqual([false, null, false])
  }, 60_000)

  it('a sync write checks approval, the part name and the version', async () => {
    const { db } = await run(FILES)
    const id = '11111111-1111-1111-1111-111111111111'
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'a@b.c'); select set_config('request.jwt.claim.sub', '${id}', false);`)
    const put = (name: string, expect: number | null, create: boolean) => db.query<{ v: number }>(`select public.put_sync_part('${name}', '{"a":1}'::jsonb, ${expect ?? 'null'}, ${create}) as v`)
    await expect(put('core', null, true)).rejects.toMatchObject({ code: '42501' })
    await db.exec(`update public.profiles set approved = true where user_id = '${id}'`)
    expect((await put('core', null, true)).rows[0]!.v).toBe(1)
    expect((await put('core', 1, false)).rows[0]!.v).toBe(2)
    await expect(put('core', 1, false)).rejects.toMatchObject({ code: '40001' })
    await expect(put('nope', null, true)).rejects.toMatchObject({ code: '22023' })
    expect((await db.query<{ words: number }>(`select words from public.people`)).rows).toHaveLength(1)
  }, 60_000)

  it('the sign-up trigger cannot be called through the API, and still makes the profile when a user is created', async () => {
    const { db } = await run(FILES)
    const can = async (role: string) => (await db.query<{ ok: boolean }>(`select has_function_privilege('${role}', 'public.handle_new_user()', 'execute') as ok`)).rows[0]!.ok
    expect([await can('anon'), await can('authenticated'), await can('supabase_auth_admin')]).toEqual([false, false, true])
    // As Supabase Auth does it: the auth role inserts the user, the trigger (security definer) writes the profile.
    await db.exec(`set role supabase_auth_admin; insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'b@c.d'); reset role;`)
    expect((await db.query<{ email: string }>(`select email from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'`)).rows).toEqual([{ email: 'b@c.d' }])
  }, 60_000)
})
