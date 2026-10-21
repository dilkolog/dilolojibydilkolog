/**
 * Adds hand-written example sentences to src/data/tenses/{fr,es}-sentences.json, the same way
 * build-tense-sentences.ts keeps the AI-made ones: a sentence goes in only when exactly one form of
 * the verb in that tense (from our checked tables) stands in it, once, and that form belongs to no
 * other tense of the verb. The form is stored in [brackets] (you may write them yourself or leave
 * them out); a sentence that fails is listed and not added. A verb's tense that has a sentence
 * already is left alone unless --replace is given.
 *
 * Every tense the verb lab shows is accepted (LAB_TENSES: the passé simple, the compound tenses,
 * the imperative…), except the French présent. A core tense is checked against the other core
 * tenses, as the build scripts do; a lab-only tense against all the lab's tenses. Two forms are
 * shared by nature and let through only when the sentence itself settles the tense:
 * - a subjunctive that is also the present, imparfait or imperative (que tu parles, que nous
 *   parlions, que usted hable) needs "que" (Spanish also "ojalá") before it;
 * - an imperative that is also the present, the subjunctive or the passé simple (Parle !, Finis !,
 *   Habla, Hablemos) must open the sentence or a clause, with no subject before it.
 *
 * Input: a TSV, one sentence per line: verb <TAB> tense <TAB> sentence <TAB> Turkish
 *
 * Usage: npx rolldown scripts/add-tense-sentences.ts -o /tmp/a.mjs -p node && node /tmp/a.mjs <fr|es> <file.tsv> [--replace] [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import es from '../src/data/tenses/es.json'
import fr from '../src/data/tenses/fr.json'
import { addConjugations } from '../src/engine/conjugation'
import { addTenses, conjugateTense, isImperative, isSubjunctive, LAB_TENSES, TENSES, type Tense } from '../src/engine/tenses'

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
  if (!(LAB_TENSES[lang] as string[]).includes(tense) || (lang === 'fr' && tense === 'present')) {
    problems.push(`${where}: unknown tense`)
    continue
  }
  if (store[verb]?.[tense] && !replace) {
    kept++
    continue
  }
  const entry = { language: lang as 'fr' | 'es', lemma: verb, partOfSpeech: 'verb' as const }
  const all = new Map<Tense, string[]>()
  for (const t of LAB_TENSES[lang] as Tense[]) {
    // The imperative leaves the persons it lacks empty ("", "parle", "", …).
    const f = conjugateTense(entry, t)?.filter(Boolean)
    if (f?.length) all.set(t, f)
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
  if (top.length !== 1) {
    problems.push(`${where}: ${top.length} forms found [${top.map((h) => text.slice(h.index, h.index + h.length)).join(', ')}] in "${text}"`)
    continue
  }
  const h = top[0]
  const core = (TENSES[lang] as Tense[]).includes(tense as Tense)
  const before = text.slice(0, h.index)
  const sharedWith = [...all].filter(([t, f]) => t !== tense && (!core || (TENSES[lang] as Tense[]).includes(t)) && f.some((o) => o.toLowerCase() === h.form.toLowerCase())).map(([t]) => t)
  const excused = (t: Tense) => {
    if (isSubjunctive(tense as Tense) && (t === 'present' || t === 'presente' || t === 'imparfait' || isImperative(t)))
      return lang === 'fr' ? /(^|[^\p{L}])qu(e[^\p{L}]|')/iu.test(before) : /(^|[^\p{L}])(que|ojalá)[^\p{L}]/iu.test(before)
    if (isImperative(tense as Tense) && (t === 'present' || t === 'presente' || t === 'passe-simple' || isSubjunctive(t))) return /(^|[,;:.!?¡¿—–-])\s*$/u.test(before)
    return false
  }
  const clash = sharedWith.filter((t) => !excused(t))
  if (clash.length) {
    problems.push(`${where}: "${h.form}" is a form of ${clash.join(', ')} too`)
    continue
  }
  const marked = `${text.slice(0, h.index)}[${text.slice(h.index, h.index + h.length)}]${text.slice(h.index + h.length)}`
  ;(store[verb] ??= {})[tense] = `${marked}\t${end(turkish)}`
  added++
}
if (!dry && added) writeFileSync(path, JSON.stringify(store))
console.log(`${dry ? '[dry] ' : ''}added ${added}, left alone ${kept}, rejected ${problems.length}`)
for (const p of problems) console.log(`  ✗ ${p}`)
