#!/usr/bin/env node
/**
 * Adds hand-written Turkish meanings and antonyms to the word packs (src/data/wordpack/<lang>.json).
 *
 * Sources, one per batch, kept in docs/veri/sozluk-ek/:
 *   <lang>-anlam-NN.tsv   word<TAB>meaning, meaning…   (only for pack words that have no Turkish meaning yet)
 *   <lang>-zit-NN.tsv     word<TAB>antonym, antonym…   (both words must be in the pack; the link is made both ways)
 * Lines starting with # and the header line "word\t…" are skipped.
 *
 * Usage: node scripts/apply-pack-extras.mjs [--dry] [es fr en]
 * Re-running is safe: a meaning never overwrites one the pack has, an antonym is never added twice.
 * Rebuilding the pack with build-wordpack.ts drops these: run this again afterwards.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const VERSION = '2026-10-21.2'
const MAX_MEANINGS = 4
const MAX_ANTONYMS = 4
const DIR = 'docs/veri/sozluk-ek'
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const languages = args.filter((a) => !a.startsWith('--'))
const LANGS = languages.length ? languages : ['es', 'fr', 'en']

const rows = (file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim() && !l.startsWith('#') && !/^word\t/.test(l))
    .map((l) => {
      const [word, list = ''] = l.split('\t')
      const items = list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return { word: word.trim(), items }
    })

let files = []
try {
  files = readdirSync(DIR)
} catch {
  console.error(`${DIR} yok`)
  process.exit(1)
}

for (const lang of LANGS) {
  const path = `src/data/wordpack/${lang}.json`
  const pack = JSON.parse(readFileSync(path, 'utf8'))
  const w = pack.w
  const report = { meanings: 0, meaningSkipped: [], antonyms: 0, antonymSkipped: [] }

  for (const file of files.filter((f) => f.startsWith(`${lang}-anlam-`) && f.endsWith('.tsv')).sort()) {
    for (const { word, items } of rows(join(DIR, file))) {
      const rec = w[word]
      if (!rec) report.meaningSkipped.push(`${word} (pakette yok)`)
      else if (rec.t?.length) report.meaningSkipped.push(`${word} (anlamı var)`)
      else if (!items.length) report.meaningSkipped.push(`${word} (boş)`)
      else {
        rec.t = [...new Set(items)].slice(0, MAX_MEANINGS)
        report.meanings++
      }
    }
  }

  const link = (a, b) => {
    const rec = w[a]
    const list = rec.n ?? []
    if (list.includes(b) || list.length >= MAX_ANTONYMS) return false
    rec.n = [...list, b]
    return true
  }
  for (const file of files.filter((f) => f.startsWith(`${lang}-zit-`) && f.endsWith('.tsv')).sort()) {
    for (const { word, items } of rows(join(DIR, file))) {
      if (!w[word]) {
        report.antonymSkipped.push(`${word} (pakette yok)`)
        continue
      }
      for (const other of items) {
        if (other === word || !w[other]) {
          report.antonymSkipped.push(`${word} → ${other} (pakette yok)`)
          continue
        }
        if (link(word, other)) report.antonyms++
        link(other, word)
      }
    }
  }

  pack.v = VERSION
  if (!dry) writeFileSync(path, JSON.stringify(pack))
  console.log(`${lang}: ${report.meanings} anlam, ${report.antonyms} zıt anlam bağı${dry ? ' (deneme, yazılmadı)' : ''}`)
  if (report.meaningSkipped.length) console.log(`  atlanan anlamlar (${report.meaningSkipped.length}): ${report.meaningSkipped.slice(0, 30).join('; ')}`)
  if (report.antonymSkipped.length) console.log(`  atlanan zıt anlamlar (${report.antonymSkipped.length}): ${report.antonymSkipped.slice(0, 30).join('; ')}`)
}
