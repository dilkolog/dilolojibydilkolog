// Builds the idiom pack (src/data/idioms/<lang>.json) from the batches in content/raw/idioms/<lang>-NNNN.json.
// A batch is an array of idioms (see src/data/idioms.ts) plus `src`: the two places each was verified in,
// which stay in the raw file and do not ship. Run: node scripts/build-idioms.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const RAW = new URL('../content/raw/idioms/', import.meta.url)
const OUT = new URL('../src/data/idioms/', import.meta.url)
const FIELDS = ['w', 'pat', 't', 'lit', 'eq', 's', 'form', 'tr', 'reg', 'area', 'level', 'theme']
const key = (w) => w.toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

let failed = false
mkdirSync(OUT, { recursive: true })
for (const language of ['en', 'fr', 'es']) {
  const files = readdirSync(RAW).filter((f) => new RegExp(`^${language}-\\d{4}\\.json$`).test(f)).sort()
  const seen = new Map()
  const items = []
  for (const file of files) {
    for (const raw of JSON.parse(readFileSync(new URL(file, RAW), 'utf8'))) {
      const k = key(raw.w ?? '')
      if (seen.has(k)) {
        console.error(`${file}: "${raw.w}" ${seen.get(k)} içinde zaten var`)
        failed = true
        continue
      }
      // The first batch is the hand-written list the pack started from; every later idiom names its two sources.
      if (file !== `${language}-0000.json` && !(Array.isArray(raw.src) && raw.src.filter(Boolean).length >= 2)) {
        console.error(`${file}: "${raw.w}" iki kaynak (src) göstermiyor`)
        failed = true
      }
      seen.set(k, file)
      const item = {}
      for (const f of FIELDS) if (typeof raw[f] === 'string' && raw[f].trim()) item[f] = raw[f].trim()
      items.push(item)
    }
  }
  writeFileSync(new URL(`${language}.json`, OUT), JSON.stringify({ language, source: 'Diloloji (özgün)', items }, null, 1) + '\n')
  const by = (f) => Object.entries(Object.groupBy(items, (i) => i[f])).map(([k, v]) => `${k} ${v.length}`).join(', ')
  console.log(`${language}: ${items.length} deyim (${files.length} parti) · ${by('level')}\n   ${by('theme')}`)
}
if (failed) process.exit(1)
