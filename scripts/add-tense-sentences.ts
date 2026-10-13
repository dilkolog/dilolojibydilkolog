/**
 * Adds hand-written example sentences to src/data/tenses/{fr,es}-sentences.json, the same way
 * build-tense-sentences.ts keeps the AI-made ones: a sentence goes in only when exactly one form of
 * the verb in that tense (from our checked tables) stands in it, once, and that form belongs to no
 * other tense of the verb. The form is stored in [brackets] (you may write them yourself or leave
 * them out); a sentence that fails is listed and not added. A verb's tense that has a sentence
 * already is left alone unless --replace is given.
 *
 * Input: a TSV, one sentence per line: verb <TAB> tense <TAB> sentence <TAB> Turkish
 *
 * Usage: npx rolldown scripts/add-tense-sentences.ts -o /tmp/a.mjs -p node && node /tmp/a.mjs <fr|es> <file.tsv> [--replace] [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import es from '../src/data/tenses/es.json'
import fr from '../src/data/tenses/fr.json'
import { addConjugations } from '../src/engine/conjugation'
import { addTenses, conjugateTense, TENSES, type Tense } from '../src/engine/tenses'

const [lang, file, ...flags] = process.argv.slice(2)
if ((lang !== 'fr' && lang !== 'es') || !file) throw new Error('usage: <fr|es> <file.tsv> [--replace] [--dry]')
const replace = flags.includes('--replace')
const dry = flags.includes('--dry')
addTenses('es', es as Record<string, unknown>)
addTenses('fr', fr as Record<string, unknown>)
// The present of verbs outside the hand tables and rules comes from UniMorph, as in the app (conjugationData.ts).
addConjugations('es', readFileSync('src/data/conjugation/es.txt', 'utf8'))
addConjugations('fr', readFileSync('src/data/conjugation/fr.txt', 'utf8'))

const path = `src/data/tenses/${lang}-sentences.json`
const store = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Record<string, string>>
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const end = (x: string) => (/[.!?…]$/.test(x) ? x : `${x}.`)

let added = 0
let kept = 0
const problems: string[] = []
for (const [n, line] of readFileSync(file, 'utf8').split('\n').entries()) {
  if (!line.trim() || line.startsWith('#')) continue
  const [verb, tense, sentence, turkish] = line.split('\t').map((x) => x?.trim())
  const where = `${n + 1}: ${verb} ${tense}`
  if (!verb || !tense || !sentence || !turkish) {
    problems.push(`${where}: missing field`)
    continue
  }
  // French sentences are never the present (the stored ones are checked for that in tenses.test.ts).
  if (!(TENSES[lang] as string[]).includes(tense) || (lang === 'fr' && tense === 'present')) {
    problems.push(`${where}: unknown tense`)
    continue
  }
  if (store[verb]?.[tense] && !replace) {
    kept++
    continue
  }
  const entry = { language: lang as 'fr' | 'es', lemma: verb, partOfSpeech: 'verb' as const }
  const all = new Map<Tense, string[]>()
  for (const t of TENSES[lang] as Tense[]) {
    const f = conjugateTense(entry, t)
    if (f) all.set(t, f)
  }
  const forms = all.get(tense as Tense)
  if (!forms) {
    problems.push(`${where}: verb has no ${tense} table`)
    continue
  }
  const text = end(sentence.replace(/[[\]]/g, ''))
  const hits: { form: string; index: number; length: number }[] = []
  for (const form of new Set(forms)) {
    for (const m of text.matchAll(new RegExp(`(?<![\\p{L}])${esc(form)}(?![\\p{L}])`, 'giu'))) hits.push({ form, index: m.index!, length: m[0].length })
  }
  // Longer forms win over their parts: "me levanto" over "levanto"; "ai mangé" over "mangé".
  const top = hits.filter((h) => !hits.some((o) => o !== h && o.length > h.length && o.index <= h.index && o.index + o.length >= h.index + h.length))
  const others = [...all].filter(([t]) => t !== tense).flatMap(([, f]) => f)
  if (top.length !== 1) {
    problems.push(`${where}: ${top.length} forms found [${top.map((h) => text.slice(h.index, h.index + h.length)).join(', ')}] in "${text}"`)
    continue
  }
  if (others.some((o) => o.toLowerCase() === top[0].form.toLowerCase())) {
    problems.push(`${where}: "${top[0].form}" is a form of another tense too`)
    continue
  }
  const h = top[0]
  const marked = `${text.slice(0, h.index)}[${text.slice(h.index, h.index + h.length)}]${text.slice(h.index + h.length)}`
  ;(store[verb] ??= {})[tense] = `${marked}\t${end(turkish)}`
  added++
}
if (!dry && added) writeFileSync(path, JSON.stringify(store))
console.log(`${dry ? '[dry] ' : ''}added ${added}, left alone ${kept}, rejected ${problems.length}`)
for (const p of problems) console.log(`  ✗ ${p}`)
