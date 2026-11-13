#!/usr/bin/env node
// A backup of Diloloji's Supabase project, taken on the owner's own computer (the free plan keeps none, and the Worker
// has too little CPU on the free plan to copy the database itself).
//
//   SUPABASE_DB_URL=… SUPABASE_URL=… SUPABASE_SECRET_KEY=…  node scripts/backup-supabase.mjs [--out DIR] [--keep N] [--no-media]
//
// - SUPABASE_DB_URL: Supabase → Connect → "Session pooler" URI with the database password filled in (the direct one is
//   IPv6 only). Needs pg_dump of the project's Postgres version or newer (macOS: `brew install postgresql@17`).
// - SUPABASE_URL, SUPABASE_SECRET_KEY: only for the media bucket (pictures, recordings); leave out with --no-media.
//
// Writes DIR/<UTC date and time>/schema.sql (the public tables, functions and policies) and data.dump (the rows of the
// public tables and of auth.users / auth.identities / storage, pg_dump's custom format), and mirrors the media bucket
// into DIR/media/ (only new or changed files are downloaded). Keeps the newest N dated folders (default 8). DIR defaults
// to ~/Diloloji-yedek. The backup holds every person's data: keep it on an encrypted disk (FileVault) and nowhere shared.
// Restoring: docs/SUPABASE.md "Yedek ve geri yükleme".

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** The tables whose rows go into data.dump: all of public, and the people's sign-ins and the media's records. */
export const DATA_TABLES = ['public.*', 'auth.users', 'auth.identities', 'storage.buckets', 'storage.objects']

/** pg_dump's arguments for the two files. */
export function dumpArgs(dbUrl, folder) {
  return {
    schema: ['--schema-only', '--no-owner', '--no-privileges', '-n', 'public', '-f', join(folder, 'schema.sql'), dbUrl],
    data: ['--data-only', '--no-owner', '--no-privileges', '-Fc', ...DATA_TABLES.flatMap((t) => ['-t', t]), '-f', join(folder, 'data.dump'), dbUrl],
  }
}

/** The folder name of a backup: its UTC date and time, so they sort by age. */
export const stampOf = (date) => date.toISOString().slice(0, 16).replace(':', '-')
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/

/** Removes all but the newest `keep` dated folders; returns the removed names. */
export function prune(out, keep) {
  const dated = readdirSync(out).filter((n) => STAMP.test(n)).sort()
  const gone = dated.slice(0, Math.max(0, dated.length - keep))
  for (const name of gone) rmSync(join(out, name), { recursive: true, force: true })
  return gone
}

const keyHeaders = (key) => (key.startsWith('sb_') ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` })

/** Every file in the media bucket, with its size: folders (entries without an id) are walked into. */
export async function listMedia(base, key, prefix = '', fetcher = fetch) {
  const files = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetcher(`${base}/storage/v1/object/list/media`, {
      method: 'POST',
      headers: { ...keyHeaders(key), 'content-type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`media list ${res.status}: ${await res.text()}`)
    const page = await res.json()
    for (const entry of page) {
      const path = prefix ? `${prefix}${entry.name}` : entry.name
      if (entry.id === null || entry.id === undefined) files.push(...(await listMedia(base, key, `${path}/`, fetcher)))
      else files.push({ path, size: Number(entry.metadata?.size ?? -1) })
    }
    if (page.length < 1000) return files
  }
}

/** Downloads the media files that are new or changed since the last backup into `folder`; returns how many. */
export async function mirrorMedia(base, key, folder, fetcher = fetch) {
  let fetched = 0
  for (const file of await listMedia(base, key, '', fetcher)) {
    if (file.path.includes('..')) continue
    const target = join(folder, file.path)
    if (existsSync(target) && statSync(target).size === file.size) continue
    const res = await fetcher(`${base}/storage/v1/object/media/${file.path.split('/').map(encodeURIComponent).join('/')}`, { headers: keyHeaders(key) })
    if (!res.ok) throw new Error(`media ${file.path} ${res.status}`)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, Buffer.from(await res.arrayBuffer()))
    fetched++
  }
  return fetched
}

function argValue(args, name, fallback) {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}

async function main() {
  const args = process.argv.slice(2)
  const out = argValue(args, '--out', join(homedir(), 'Diloloji-yedek'))
  const keep = Math.max(1, Number(argValue(args, '--keep', '8')) || 8)
  const withMedia = !args.includes('--no-media')
  const dbUrl = process.env.SUPABASE_DB_URL?.trim()
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL tanımlı değil (Supabase → Connect → Session pooler, şifre dahil).')
    process.exit(1)
  }
  const version = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
  if (version.status !== 0) {
    console.error('pg_dump bulunamadı. macOS: brew install postgresql@17 (ve PATH’e ekle).')
    process.exit(1)
  }
  const folder = join(out, stampOf(new Date()))
  mkdirSync(folder, { recursive: true })
  const { schema, data } = dumpArgs(dbUrl, folder)
  for (const [name, list] of [['şema', schema], ['veri', data]]) {
    const run = spawnSync('pg_dump', list, { stdio: ['ignore', 'inherit', 'inherit'] })
    if (run.status !== 0) {
      console.error(`pg_dump (${name}) başarısız oldu; yarım yedek siliniyor.`)
      rmSync(folder, { recursive: true, force: true })
      process.exit(1)
    }
  }
  console.log(`Veritabanı: ${folder}`)
  if (withMedia) {
    const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
    const key = process.env.SUPABASE_SECRET_KEY?.trim()
    if (!base || !key) {
      console.error('Medya için SUPABASE_URL ve SUPABASE_SECRET_KEY gerekli (ya da --no-media).')
      process.exit(1)
    }
    const fetched = await mirrorMedia(base, key, join(out, 'media'))
    console.log(`Medya: ${fetched} yeni ya da değişmiş dosya indirildi (${join(out, 'media')}).`)
  }
  const gone = prune(out, keep)
  if (gone.length) console.log(`Eski yedekler silindi: ${gone.join(', ')}`)
  writeFileSync(join(out, 'SON-YEDEK.txt'), `${new Date().toISOString()}\n${folder}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
