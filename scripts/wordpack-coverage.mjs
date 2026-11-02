#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const out = option('--out', 'docs/veri/sozluk-kapsami')
const limit = Number(option('--limit', '200'))
if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid --limit')
mkdirSync(out, { recursive: true })
const examplesOf = c => Array.isArray(c) ? c : typeof c === 'string' ? c.split('\n').map(line => line.split('\t')) : c?.s ? c.s.map((s, i) => [s, c.t?.[i] ?? '']) : []
const summary = {}
const tasks = []
for (const language of ['en', 'fr', 'es']) {
  const pack = JSON.parse(readFileSync(`src/data/wordpack/${language}.json`, 'utf8'))
  const ranks = new Map(readFileSync(`src/data/frequency/${language}.txt`, 'utf8').split(/\r?\n/).filter(Boolean).map((w, i) => [w.toLocaleLowerCase(language), i + 1]))
  const meaningful = key => pack.w[key]?.t?.some(t => t.trim())
  const viaBase = key => {
    const seen = new Set()
    while (pack.f?.[key] && !seen.has(key)) { seen.add(key); key = pack.f[key]; if (meaningful(key)) return true }
    return false
  }
  const classify = (word, rec) => {
    if (viaBase(word)) return 'form_resolved'
    if (pack.f?.[word]) return 'form_needs_base'
    if (!rec.p || word.length < 2 || /surname|given name|proper name|from the name|diminutive of [A-Z]/i.test(rec.e ?? '') || (rec.x?.en?.length && rec.x.en.every(w => /^[A-Z]/.test(w)))) return 'manual_review'
    return 'translation_candidate'
  }
  const missing = Object.entries(pack.w).filter(([w]) => !meaningful(w)).map(([word, rec]) => ({ language, word, rank: ranks.get(word) ?? null, pos: rec.p ?? null, category: classify(word, rec), definition: rec.d ?? null, examples: examplesOf(rec.c).slice(0, 2), english: rec.x?.en ?? [] })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.word.localeCompare(b.word))
  const buckets = Object.fromEntries([1000, 5000, 10000, 20000].map(n => {
    const entries = [...ranks].filter(([, rank]) => rank <= n)
    return [n, { frequencyEntries: entries.length, direct: entries.filter(([w]) => meaningful(w)).length, withBase: entries.filter(([w]) => meaningful(w) || viaBase(w)).length, absentFromPack: entries.filter(([w]) => !pack.w[w] && !viaBase(w)).length }]
  }))
  summary[language] = { version: pack.v, total: Object.keys(pack.w).length, withTurkish: Object.keys(pack.w).filter(meaningful).length, missing: missing.length, categories: Object.fromEntries(['form_resolved', 'form_needs_base', 'manual_review', 'translation_candidate'].map(c => [c, missing.filter(w => w.category === c).length])), frequency: buckets }
  writeFileSync(join(out, `${language}-missing.jsonl`), missing.map(x => JSON.stringify(x)).join('\n') + '\n')
  tasks.push(...missing.filter(w => w.category === 'translation_candidate').slice(0, limit))
}
tasks.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.language.localeCompare(b.language))
writeFileSync(join(out, 'translation-queue.jsonl'), tasks.map(x => JSON.stringify(x)).join('\n') + '\n')
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))
