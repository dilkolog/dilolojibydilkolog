/**
 * The weekly "most missed" report (docs/ICERIK-FABRIKASI.md §5.5): how everyone answered the content's items, from
 * Supabase's content_item_stats() (supabase/migrations/0015_content_item_stats.sql), with each item's text and file.
 *
 *   SUPABASE_URL=… SUPABASE_SECRET_KEY=… npm run content -- missed [--days 7] [--out FILE]
 *   npm run content -- missed --input rows.json [--out FILE]     (rows exported from the SQL Editor)
 *
 * The secret key never leaves the owner's computer; scripts/backup-mac.sh runs this each week after the backup.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from './lib/args'
import { buildIndex, missedMarkdown, wordInfo, type ItemRow } from './lib/missed'

const { flags } = parseArgs(process.argv.slice(2))
const days = Number(flags.days ?? 7)
const since = new Date(Date.now() - days * 86_400_000).toISOString()

async function rows(): Promise<ItemRow[]> {
  if (typeof flags.input === 'string') return JSON.parse(readFileSync(flags.input, 'utf8')) as ItemRow[]
  const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '')
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are needed (or --input rows.json)')
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }) }
  const res = await fetch(`${url}/rest/v1/rpc/content_item_stats`, { method: 'POST', headers, body: JSON.stringify({ p_since: since }) })
  if (!res.ok) throw new Error(`content_item_stats: ${res.status} ${(await res.text()).slice(0, 200)} (has 0015 been run in the SQL Editor?)`)
  return (await res.json()) as ItemRow[]
}

const index = buildIndex()
const report = missedMarkdown(await rows(), (r) => (r.kind === 'word' ? wordInfo(r.item) : index.get(r.item)), since.slice(0, 10))
if (typeof flags.out === 'string') {
  writeFileSync(flags.out, report)
  console.log(`wrote ${flags.out}`)
} else console.log(report)
