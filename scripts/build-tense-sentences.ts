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
import { writeFileSync } from 'node:fs'
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

type Source = Record<string, Record<string, { es: string; tr: string; person?: string }>>
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
  [/büyükannnem/g, 'büyükannem'],
  [/evindeyidim/g, 'evindeydim'],
]
const fixTr = (t: string) => TR_FIXES.reduce((x, [re, to]) => x.replace(re, to), t)

/**
 * Indefinido or imperfecto (src/data/tenses/es-aspect.json): sentences whose time words settle it
 * (ayer, de repente → indefinido; cuando era niño, todos los días → imperfecto). Each item:
 * [verb, tense, sentence with [form], the other tense's form, Turkish, cue].
 */
const ASPECT_CUES: Partial<Record<Tense, RegExp>> = {
  preterito: /\b(ayer|anoche|anteayer|de repente|el año pasado|la semana pasada|el mes pasado|el verano pasado|el (lunes|martes|miércoles|jueves|viernes|sábado|domingo) pasado|hace (dos|tres|cinco|diez|unos|unas|muchos|\d+) (años|días|meses|semanas|horas)|una vez)\b/i,
  imperfecto: /\b(cuando (era|éramos|eras) (niño|niña|niños|joven|jóvenes|pequeño|pequeña|pequeños)|de (niño|niña|pequeño|pequeña|joven)|todos los (días|veranos|años|domingos|sábados|inviernos|fines de semana|lunes)|todas las (mañanas|tardes|noches|semanas)|cada (día|año|verano|semana|mañana|noche)|antes|mientras|a menudo|normalmente|por las (mañanas|tardes|noches))\b/i,
}
const PERSON: Record<string, number> = { yo: 0, tú: 1, él: 2, ella: 2, usted: 2, 'él/ella': 2, 'él/ella/usted': 2, nosotros: 3, nosotras: 3, vosotros: 4, ellos: 5, ellas: 5, 'ellos/ellas': 5, ustedes: 5 }
/** Where a cue of the tense stands in the sentence, outside the verb itself ("quand j'étais" can't cue étais). */
function cueOutside(re: RegExp, text: string, start: number, end: number): string | undefined {
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) {
    if (m.index! + m[0].length <= start || m.index! >= end) return m[0]
  }
  return undefined
}
const aspect: [string, Tense, string, string, string, string][] = []

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
    const other: Tense | undefined = tense === 'preterito' ? 'imperfecto' : tense === 'imperfecto' ? 'preterito' : undefined
    const cue = other && !ASPECT_CUES[other]!.test(text) ? cueOutside(ASPECT_CUES[tense]!, text, h.index, h.index + h.length) : undefined
    if (other && cue) {
      // The person: from the form, or (hablaba is yo and él) from the sentence's own note.
      const people = forms.map((f, i) => (f.toLowerCase() === h.form.toLowerCase() ? i : -1)).filter((i) => i >= 0)
      const otherForms = all.get(other)!
      const alts = new Set(people.map((i) => otherForms[i]))
      const noted = PERSON[(s.person ?? '').trim().toLowerCase()]
      const alt = alts.size === 1 ? [...alts][0] : noted !== undefined && people.includes(noted) ? otherForms[noted] : undefined
      if (alt) aspect.push([verb, tense, marked, alt, end(fixTr(s.tr.trim())), cue])
    }
  }
}
writeFileSync('src/data/tenses/es-sentences.json', JSON.stringify(out))
writeFileSync('src/data/tenses/es-aspect.json', JSON.stringify(aspect))
console.log(`es aspect: ${aspect.length} items (${aspect.filter((a) => a[1] === 'imperfecto').length} imperfecto)`)
console.log(`kept ${kept}, dropped ${dropped}, verbs ${Object.keys(out).length}`)
