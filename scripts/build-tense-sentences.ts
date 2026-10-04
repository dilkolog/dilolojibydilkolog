/**
 * Builds src/data/tenses/es-sentences.json: one example sentence per Spanish verb and tense, for
 * conjugation questions in context. The sentences (with Turkish translations) come from the
 * diloloji project, where they were written with AI help, so none is trusted as is: a sentence is
 * kept only when exactly one form of the verb in that tense, taken from our checked tables,
 * appears in it exactly once, and that form belongs to no other tense of the verb (hablamos is
 * both presente and indefinido, so the sentence can't tell). The form is stored in [brackets].
 *
 * Usage: npx rolldown scripts/build-tense-sentences.ts -o /tmp/s.mjs -p node && node /tmp/s.mjs <diloloji dir>
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import es from '../src/data/tenses/es.json'
import { addTenses, conjugateTense, TENSES, type Tense } from '../src/engine/tenses'

const [dilolojiDir] = process.argv.slice(2)
addTenses('es', es as Record<string, unknown>)

const KEYS: Record<string, Tense> = {
  Presente: 'presente',
  'Pretérito Indefinido': 'preterito',
  'Pretérito Imperfecto': 'imperfecto',
  'Pretérito Perfecto': 'perfecto',
  'Futuro Simple': 'futuro',
  Condicional: 'condicional',
  'Subjuntivo Presente': 'subjuntivo',
}

type Source = Record<string, Record<string, { es: string; tr: string }>>
const { exampleSentences } = (await import(pathToFileURL(`${dilolojiDir}/src/data/example_sentences.js`).href)) as { exampleSentences: Source }

/** Spelling slips found when reading samples of the Turkish translations. */
const TR_FIXES: [RegExp, string][] = [
  [/kitaları/g, 'kitapları'],
  [/Susuz olsaydım/g, 'Susamış olsaydım'],
  [/biriktirir\(di\)m/g, 'biriktirirdim'],
  [/gelebilmen umuduyla/g, 'gelebilmeni umuyorum'],
  [/uygulaman umuduyla/g, 'uygulamanı umuyorum'],
  [/girmen\/adım atman umuduyla/g, 'adım atmanı umuyorum'],
  [/su kaynatırım/g, 'su kaynatırdım'],
  [/dondurucuda soğuturuz/g, 'dondurucuda soğuturduk'],
]
const fixTr = (t: string) => TR_FIXES.reduce((x, [re, to]) => x.replace(re, to), t)

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const out: Record<string, Record<string, string>> = {}
let kept = 0
let dropped = 0
for (const [verb, tenses] of Object.entries(exampleSentences)) {
  const entry = { language: 'es' as const, lemma: verb, partOfSpeech: 'verb' as const }
  const all = new Map<Tense, string[]>()
  for (const t of TENSES.es) {
    const f = conjugateTense(entry, t)
    if (f) all.set(t, f)
  }
  for (const [key, s] of Object.entries(tenses)) {
    const tense = KEYS[key]
    const forms = tense && all.get(tense)
    if (!forms || !s?.es || !s.tr) continue
    const end = (x: string) => (/[.!?…]$/.test(x) ? x : `${x}.`)
    const text = end(s.es.trim())
    const hits: { form: string; index: number; length: number }[] = []
    for (const form of new Set(forms)) {
      const re = new RegExp(`(?<![\\p{L}])${esc(form)}(?![\\p{L}])`, 'giu')
      for (const m of text.matchAll(re)) hits.push({ form, index: m.index!, length: m[0].length })
    }
    const others = [...all].filter(([t]) => t !== tense).flatMap(([, f]) => f)
    // Longer forms win over their parts: "me levanto" over "levanto".
    const top = hits.filter((h) => !hits.some((o) => o !== h && o.length > h.length && o.index <= h.index && o.index + o.length >= h.index + h.length))
    if (top.length !== 1 || others.includes(top[0].form)) {
      dropped++
      continue
    }
    const h = top[0]
    const marked = `${text.slice(0, h.index)}[${text.slice(h.index, h.index + h.length)}]${text.slice(h.index + h.length)}`
    ;(out[verb] ??= {})[tense] = `${marked}\t${end(fixTr(s.tr.trim()))}`
    kept++
  }
}
writeFileSync('src/data/tenses/es-sentences.json', JSON.stringify(out))
console.log(`kept ${kept}, dropped ${dropped}, verbs ${Object.keys(out).length}`)
