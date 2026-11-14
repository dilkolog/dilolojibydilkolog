// Build the PTE-style practice pack (src/data/pte/en.json) from content/raw/pte/*.json.
// Each raw file is an object with any of the task lists: { "wfd": [...], "rs": [...], "ra": [...], "fib": [...], "asq": [...] }
// (the item shapes and the rules are in src/data/pte.ts). Files are read in name order; a rejected batch writes nothing.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { PTE_TASKS, pteProblems } from '../src/data/pte.ts'

const RAW = new URL('../content/raw/pte/', import.meta.url)
const OUT = new URL('../src/data/pte/', import.meta.url)
const FIELDS = {
  wfd: ['id', 'text', 'level', 'topic', 'tr'],
  rs: ['id', 'text', 'level', 'tr'],
  ra: ['id', 'text', 'level', 'topic', 'tr'],
  fib: ['id', 'text', 'blanks', 'level', 'topic', 'tr'],
  asq: ['id', 'question', 'answers', 'level', 'tr'],
}
const trim = (v) => (typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.map(trim) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trim(x)])) : v)

export function buildPte({ raw = RAW, out = OUT, log = console.log, error = console.error } = {}) {
  // No raw content yet: nothing to build, and the pack already in the app stays as it is.
  const files = existsSync(raw) ? readdirSync(raw).filter((f) => f.endsWith('.json')).sort() : []
  if (!files.length) {
    log('content/raw/pte/ boş ya da yok: src/data/pte/en.json olduğu gibi kaldı.')
    return true
  }
  const items = Object.fromEntries(PTE_TASKS.map((t) => [t, []]))
  let failed = false
  for (const file of files) {
    let batch
    try {
      batch = JSON.parse(readFileSync(new URL(file, raw), 'utf8'))
    } catch (e) {
      error(`${file}: JSON okunamadı (${e.message})`)
      failed = true
      continue
    }
    if (!batch || typeof batch !== 'object' || Array.isArray(batch)) {
      error(`${file}: görev listelerini taşıyan bir nesne olmalı ({ "wfd": [...], ... })`)
      failed = true
      continue
    }
    for (const key of Object.keys(batch)) if (!PTE_TASKS.includes(key)) error(`${file}: bilinmeyen görev "${key}" atlandı`)
    for (const task of PTE_TASKS) {
      if (batch[task] === undefined) continue
      if (!Array.isArray(batch[task])) {
        error(`${file}: ${task} bir liste değil`)
        failed = true
        continue
      }
      for (const row of batch[task]) items[task].push({ file, row: Object.fromEntries(FIELDS[task].filter((f) => row?.[f] !== undefined).map((f) => [f, trim(row[f])])) })
    }
  }
  // Checked together: an id must be unique across every file and task.
  const problems = pteProblems(Object.fromEntries(PTE_TASKS.map((t) => [t, items[t].map((x) => x.row)])))
  for (const p of problems) {
    const [task, rest] = p.split('[')
    const index = Number(rest?.split(']')[0])
    error(`${items[task]?.[index]?.file ?? ''}: ${p}`)
  }
  if (failed || problems.length) return false
  mkdirSync(out, { recursive: true })
  const pack = { language: 'en', source: 'Diloloji (özgün)', ...Object.fromEntries(PTE_TASKS.map((t) => [t, items[t].map((x) => x.row)])) }
  writeFileSync(new URL('en.json', out), JSON.stringify(pack, null, 1) + '\n')
  log(`en: ${PTE_TASKS.map((t) => `${t} ${items[t].length}`).join(', ')} (${files.length} dosya)`)
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && !buildPte()) process.exitCode = 1
